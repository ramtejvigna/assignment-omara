package services

import (
	"context"
	"fmt" // Formatted I/O operations
	"strategy-analyst/internal/models"
	"strings"
	"time"

	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
)

type AIService struct {
	client *genai.Client
}

func NewAIService(apiKey string) *AIService {
	if apiKey == "" {
		return &AIService{client: nil}
	}

	client, err := genai.NewClient(context.Background(), option.WithAPIKey(apiKey))
	if err != nil {
		fmt.Printf("Error creating Gemini client: %v\n", err)
		return &AIService{client: nil}
	}

	return &AIService{client: client}
}

func (ai *AIService) GenerateInsight(ctx context.Context, query string, documentChunks []string, documentName string) (string, error) {
	if ai.client == nil {
		return "", fmt.Errorf("AI client not initialized")
	}

	// Use Gemini 2.0 Flash model
	model := ai.client.GenerativeModel("gemini-2.0-flash-exp")

	// Configure the model for better strategic analysis
	model.SetTemperature(0.3)
	model.SetTopK(40)
	model.SetTopP(0.95)
	model.SetMaxOutputTokens(2048)

	// Construct a sophisticated prompt
	prompt := ai.buildPrompt(query, documentChunks, documentName)

	// Generate response
	response, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return "", fmt.Errorf("failed to generate content: %w", err)
	}

	if len(response.Candidates) == 0 || len(response.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("no response generated")
	}

	// Extract text from the response
	var result strings.Builder
	for _, part := range response.Candidates[0].Content.Parts {
		if textPart, ok := part.(genai.Text); ok {
			result.WriteString(string(textPart))
		}
	}

	return result.String(), nil
}

func (ai *AIService) buildPrompt(query string, documentChunks []string, documentName string) string {
	var prompt strings.Builder

	prompt.WriteString("You are a Strategic Insight Analyst. Your role is to analyze business documents and provide strategic insights based on the provided content.\n\n")

	prompt.WriteString("INSTRUCTIONS:\n")
	prompt.WriteString("1. Analyze the provided document content carefully\n")
	prompt.WriteString("2. Focus on insights, and key findings\n")
	prompt.WriteString("3. Base your analysis ONLY on the provided document content\n")
	prompt.WriteString("4. If specific information is not available in the document, clearly state this\n")
	prompt.WriteString("5. Provide structured, actionable insights\n")
	prompt.WriteString("6. Use bullet points or numbered lists when appropriate for clarity\n\n")

	prompt.WriteString(fmt.Sprintf("DOCUMENT: %s\n\n", documentName))

	prompt.WriteString("DOCUMENT CONTENT:\n")
	for i, chunk := range documentChunks {
		prompt.WriteString(fmt.Sprintf("--- Chunk %d ---\n%s\n\n", i+1, chunk))
	}

	prompt.WriteString(fmt.Sprintf("USER QUERY: %s\n\n", query))

	prompt.WriteString("STRATEGIC ANALYSIS:\n")
	prompt.WriteString("Please provide your strategic analysis and insights based on the above document content and user query.")

	return prompt.String()
}

func (ai *AIService) Close() {
	if ai.client != nil {
		ai.client.Close()
	}
}

// CompareDocuments generates AI-powered comparison between multiple documents
func (ai *AIService) CompareDocuments(ctx context.Context, documents []*models.Document, documentsChunks [][]string, compareType string) (*models.DocumentComparison, error) {
	if ai.client == nil {
		return nil, fmt.Errorf("AI client not initialized")
	}

	// Use Gemini 2.0 Flash model
	model := ai.client.GenerativeModel("gemini-2.0-flash-exp")

	// Configure the model for document comparison
	model.SetTemperature(0.4)
	model.SetTopK(40)
	model.SetTopP(0.95)
	model.SetMaxOutputTokens(3000)

	// Build comparison prompt
	prompt := ai.buildComparisonPrompt(documents, documentsChunks, compareType)

	// Generate response
	response, err := model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return nil, fmt.Errorf("failed to generate comparison: %w", err)
	}

	if len(response.Candidates) == 0 || len(response.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("no comparison generated")
	}

	// Extract text from the response
	var result strings.Builder
	for _, part := range response.Candidates[0].Content.Parts {
		if textPart, ok := part.(genai.Text); ok {
			result.WriteString(string(textPart))
		}
	}

	// Parse the AI response into structured comparison
	comparison := ai.parseComparisonResponse(result.String(), documents)

	return comparison, nil
}

func (ai *AIService) buildComparisonPrompt(documents []*models.Document, documentsChunks [][]string, compareType string) string {
	var prompt strings.Builder

	prompt.WriteString("You are a Strategic Document Comparison Analyst. Your role is to analyze and compare multiple business documents, providing structured insights.\n\n")

	prompt.WriteString("INSTRUCTIONS:\n")
	prompt.WriteString("1. Analyze each document's content carefully\n")
	prompt.WriteString("2. Identify key similarities and differences between documents\n")
	prompt.WriteString("3. Extract common themes and unique aspects\n")
	prompt.WriteString("4. Provide strategic insights based on the comparison\n")
	prompt.WriteString("5. Structure your response with clear sections\n")
	prompt.WriteString("6. Base analysis ONLY on provided document content\n\n")

	switch compareType {
	case "summary":
		prompt.WriteString("FOCUS: Provide a high-level comparison summary\n")
	case "detailed":
		prompt.WriteString("FOCUS: Provide detailed analysis with specific examples\n")
	case "themes":
		prompt.WriteString("FOCUS: Identify and compare major themes across documents\n")
	case "differences":
		prompt.WriteString("FOCUS: Highlight key differences and contrasts\n")
	default:
		prompt.WriteString("FOCUS: Provide comprehensive comparison analysis\n")
	}

	prompt.WriteString("\nDOCUMENTS TO COMPARE:\n")

	for i, doc := range documents {
		prompt.WriteString(fmt.Sprintf("\n--- DOCUMENT %d: %s ---\n", i+1, doc.FileName))
		chunks := documentsChunks[i]
		for j, chunk := range chunks {
			if j < 10 { // Limit chunks to prevent token overflow
				prompt.WriteString(fmt.Sprintf("Content Part %d: %s\n\n", j+1, chunk))
			}
		}
	}

	prompt.WriteString("\nPlease provide your comparison analysis in the following format:\n")
	prompt.WriteString("SUMMARY: [Overall comparison summary]\n")
	prompt.WriteString("SIMILARITIES: [Key similarities between documents]\n")
	prompt.WriteString("DIFFERENCES: [Key differences between documents]\n")
	prompt.WriteString("KEY_THEMES: [Common themes and topics]\n")
	prompt.WriteString("INSIGHTS: [Strategic insights and recommendations]\n")

	return prompt.String()
}

func (ai *AIService) parseComparisonResponse(response string, documents []*models.Document) *models.DocumentComparison {
	comparison := &models.DocumentComparison{
		Documents:    make([]models.Document, len(documents)),
		Similarities: []string{},
		Differences:  []string{},
		KeyThemes:    []string{},
		Insights:     []string{},
		ComparedAt:   time.Now(),
	}

	// Copy documents
	for i, doc := range documents {
		comparison.Documents[i] = *doc
	}

	// Parse sections from AI response
	sections := map[string]*[]string{
		"SUMMARY:":      nil,
		"SIMILARITIES:": &comparison.Similarities,
		"DIFFERENCES:":  &comparison.Differences,
		"KEY_THEMES:":   &comparison.KeyThemes,
		"INSIGHTS:":     &comparison.Insights,
	}

	lines := strings.Split(response, "\n")
	var currentSection *[]string
	var summaryBuilder strings.Builder

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		// Check if this line starts a new section
		sectionFound := false
		for sectionName, sectionSlice := range sections {
			if strings.HasPrefix(strings.ToUpper(line), sectionName) {
				if sectionName == "SUMMARY:" {
					currentSection = nil
					// Extract summary content from the same line
					summaryContent := strings.TrimSpace(line[len(sectionName):])
					if summaryContent != "" {
						summaryBuilder.WriteString(summaryContent)
					}
				} else {
					currentSection = sectionSlice
				}
				sectionFound = true
				break
			}
		}

		if !sectionFound {
			if currentSection != nil {
				// Add content to current section
				if strings.HasPrefix(line, "-") || strings.HasPrefix(line, "•") || strings.HasPrefix(line, "*") {
					// Remove bullet points and add as separate item
					content := strings.TrimSpace(strings.TrimPrefix(strings.TrimPrefix(strings.TrimPrefix(line, "-"), "•"), "*"))
					if content != "" {
						*currentSection = append(*currentSection, content)
					}
				} else if line != "" {
					*currentSection = append(*currentSection, line)
				}
			} else {
				// If no section is active, add to summary
				if summaryBuilder.Len() > 0 {
					summaryBuilder.WriteString(" ")
				}
				summaryBuilder.WriteString(line)
			}
		}
	}

	comparison.Summary = summaryBuilder.String()

	// Ensure we have at least some content
	if comparison.Summary == "" {
		comparison.Summary = "Document comparison completed. Please review the detailed analysis below."
	}

	return comparison
}

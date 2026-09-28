using System.Net.Http.Json;
using System.Text;
using System.Text.Json.Serialization;
using CodeLive.Api.Models;

namespace CodeLive.Api.Services;

public class Judge0Options
{
    public string BaseUrl { get; set; } = "https://ce.judge0.com";
    public string? ApiKey { get; set; }
    public int TimeoutSeconds { get; set; } = 30;
}

public interface ICodeExecutionService
{
    Task<CodeExecutionResponse> ExecuteAsync(CodeExecutionRequest request, CancellationToken ct = default);
}

public class Judge0ExecutionService(HttpClient http, ILogger<Judge0ExecutionService> logger) : ICodeExecutionService
{
    public const int MaxOutputLength = 12_000;
    public const int MaxSourceLength = 64_000;

    private static readonly Dictionary<string, int> LanguageIds = new(StringComparer.OrdinalIgnoreCase)
    {
        ["javascript"] = 63, ["js"] = 63,
        ["python"] = 71, ["py"] = 71,
        ["cpp"] = 54, ["c++"] = 54,
    };

    public async Task<CodeExecutionResponse> ExecuteAsync(CodeExecutionRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Code))
            return new("Nothing to run: the editor is empty.", true, "Empty");
        if (request.Code.Length > MaxSourceLength)
            return new($"Source code too large (max {MaxSourceLength} characters).", true, "Rejected");
        if (!LanguageIds.TryGetValue(request.Language ?? "", out var languageId))
            return new($"Unsupported language '{request.Language}'.", true, "Rejected");

        try
        {
            using var response = await http.PostAsJsonAsync(
                "submissions?base64_encoded=false&wait=true",
                new Judge0Submission(request.Code, languageId), ct);

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(ct);
                logger.LogWarning("Judge0 returned {Status}: {Body}", response.StatusCode, body);
                return new(Clamp($"Execution service error ({(int)response.StatusCode}): {body}"), true, "ServiceError");
            }

            var result = await response.Content.ReadFromJsonAsync<Judge0Result>(ct);
            if (result is null) return new("Empty response from execution service.", true, "ServiceError");

            var sb = new StringBuilder();
            void Append(string? s) { if (!string.IsNullOrEmpty(s)) sb.Append(s).Append(s.EndsWith('\n') ? "" : "\n"); }
            Append(result.CompileOutput);
            Append(result.Stdout);
            Append(result.Stderr);
            if (sb.Length == 0) Append(result.Message);

            var statusId = result.Status?.Id ?? 0;
            var status = result.Status?.Description ?? "Unknown";
            var output = sb.Length == 0 ? "(no output)" : sb.ToString();
            return new(Clamp(output), statusId != 3, status); // 3 = Accepted
        }
        catch (TaskCanceledException) when (!ct.IsCancellationRequested)
        {
            return new("Execution timed out while waiting for Judge0.", true, "Timeout");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Judge0 execution failed");
            return new($"Execution failed: {ex.Message}", true, "ServiceError");
        }
    }

    private static string Clamp(string s) =>
        s.Length <= MaxOutputLength ? s : s[..MaxOutputLength] + $"\n... output truncated ({s.Length - MaxOutputLength} more characters)";

    private record Judge0Submission(
        [property: JsonPropertyName("source_code")] string SourceCode,
        [property: JsonPropertyName("language_id")] int LanguageId);

    private record Judge0Status(
        [property: JsonPropertyName("id")] int Id,
        [property: JsonPropertyName("description")] string? Description);

    private record Judge0Result(
        [property: JsonPropertyName("stdout")] string? Stdout,
        [property: JsonPropertyName("stderr")] string? Stderr,
        [property: JsonPropertyName("compile_output")] string? CompileOutput,
        [property: JsonPropertyName("message")] string? Message,
        [property: JsonPropertyName("status")] Judge0Status? Status);
}


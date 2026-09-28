using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using CodeLive.Api.Models;

namespace CodeLive.Api.Services;

public interface ICodeExecutionService
{
    Task<CodeExecutionResponse> ExecuteAsync(CodeExecutionRequest request, CancellationToken ct = default);
}

public class Judge0Options
{
    public string BaseUrl { get; set; } = "https://ce.judge0.com";
    public string ApiKey { get; set; } = "";
    public int TimeoutSeconds { get; set; } = 30;
}

public class Judge0ExecutionService(HttpClient http, ILogger<Judge0ExecutionService> logger) : ICodeExecutionService
{
    private static readonly Dictionary<string, int> Languages = new(StringComparer.OrdinalIgnoreCase)
    {
        ["javascript"] = 63,
        ["js"] = 63,
        ["python"] = 71,
        ["py"] = 71,
        ["cpp"] = 54,
        ["c++"] = 54,
    };

    public async Task<CodeExecutionResponse> ExecuteAsync(CodeExecutionRequest request, CancellationToken ct = default)
    {
        if (!Languages.TryGetValue(request.Language ?? "", out var langId))
            return new CodeExecutionResponse($"Unsupported language: {request.Language}", true, "Unsupported");

        var payload = JsonSerializer.Serialize(new { source_code = request.Code, language_id = langId });
        var res = await http.PostAsync("submissions?base64_encoded=false&wait=true",
            new StringContent(payload, Encoding.UTF8, "application/json"), ct);

        var body = await res.Content.ReadAsStringAsync(ct);
        return new CodeExecutionResponse(body, !res.IsSuccessStatusCode, res.StatusCode.ToString());
    }
}

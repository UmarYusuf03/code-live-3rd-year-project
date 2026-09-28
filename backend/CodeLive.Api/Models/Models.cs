using System.Collections.Concurrent;

namespace CodeLive.Api.Models;

public static class Roles
{
    public const string Lecturer = "lecturer";
    public const string Student = "student";

    public static string Normalize(string? role) =>
        string.Equals(role, Lecturer, StringComparison.OrdinalIgnoreCase) ? Lecturer : Student;
}

public class User
{
    public required string ConnectionId { get; init; }
    public required string Name { get; init; }
    public required string Role { get; init; }
    public bool CanEdit { get; set; }
}

public class Room
{
    public required string RoomId { get; init; }
    public bool GlobalEdit { get; set; }
    public ConcurrentDictionary<string, User> Users { get; } = new();
}

public record CodeExecutionRequest(string Code, string Language);

public record CodeExecutionResponse(string Output, bool IsError, string Status = "");

public record RoomStateDto(string RoomId, bool GlobalEdit, IReadOnlyList<User> Participants, User Self);


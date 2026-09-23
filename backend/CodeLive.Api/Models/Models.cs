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
    public System.Collections.Concurrent.ConcurrentDictionary<string, User> Users { get; } = new();
}

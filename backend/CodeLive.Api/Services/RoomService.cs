using System.Collections.Concurrent;
using CodeLive.Api.Models;

namespace CodeLive.Api.Services;

public interface IRoomService
{
    Room AddUser(string roomId, User user);
    User? RemoveUser(string roomId, string connectionId);
    User? GetUser(string roomId, string connectionId);
    Room? GetRoom(string roomId);
    bool SetGlobalEdit(string roomId, bool enabled);
    User? SetUserEdit(string roomId, string connectionId, bool canEdit);
    IReadOnlyList<string> GetRoomsForConnection(string connectionId);
    IReadOnlyList<User> GetParticipants(string roomId);
}

/// <summary>Thread-safe in-memory room registry. Empty rooms are removed automatically.</summary>
public class InMemoryRoomService : IRoomService
{
    private readonly ConcurrentDictionary<string, Room> _rooms = new(StringComparer.OrdinalIgnoreCase);
    private readonly object _lifecycleLock = new();

    public Room AddUser(string roomId, User user)
    {
        lock (_lifecycleLock)
        {
            var room = _rooms.GetOrAdd(roomId, id => new Room { RoomId = id });
            room.Users[user.ConnectionId] = user;
            return room;
        }
    }

    public User? RemoveUser(string roomId, string connectionId)
    {
        lock (_lifecycleLock)
        {
            if (!_rooms.TryGetValue(roomId, out var room)) return null;
            room.Users.TryRemove(connectionId, out var removed);
            if (room.Users.IsEmpty) _rooms.TryRemove(roomId, out _);
            return removed;
        }
    }

    public User? GetUser(string roomId, string connectionId) =>
        _rooms.TryGetValue(roomId, out var room) && room.Users.TryGetValue(connectionId, out var user) ? user : null;

    public Room? GetRoom(string roomId) => _rooms.TryGetValue(roomId, out var room) ? room : null;

    public bool SetGlobalEdit(string roomId, bool enabled)
    {
        if (!_rooms.TryGetValue(roomId, out var room)) return false;
        room.GlobalEdit = enabled;
        return true;
    }

    public User? SetUserEdit(string roomId, string connectionId, bool canEdit)
    {
        var user = GetUser(roomId, connectionId);
        if (user is null) return null;
        user.CanEdit = canEdit;
        return user;
    }

    public IReadOnlyList<string> GetRoomsForConnection(string connectionId) =>
        _rooms.Values.Where(r => r.Users.ContainsKey(connectionId)).Select(r => r.RoomId).ToList();

    public IReadOnlyList<User> GetParticipants(string roomId) =>
        GetRoom(roomId)?.Users.Values
            .OrderByDescending(u => u.Role == Roles.Lecturer)
            .ThenBy(u => u.Name, StringComparer.OrdinalIgnoreCase)
            .ToList() ?? [];
}


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

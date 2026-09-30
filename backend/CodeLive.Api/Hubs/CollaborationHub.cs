using Microsoft.AspNetCore.SignalR;
using CodeLive.Api.Models;
using CodeLive.Api.Services;

namespace CodeLive.Api.Hubs;

public class CollaborationHub(IRoomService rooms, ICodeExecutionService executor, ILogger<CollaborationHub> logger) : Hub
{
    public async Task<object> JoinRoom(string roomId, string userName, string role)
    {
        var normalizedRole = Roles.Normalize(role);
        var user = new User
        {
            ConnectionId = Context.ConnectionId,
            Name = string.IsNullOrWhiteSpace(userName) ? "Anonymous" : userName.Trim(),
            Role = normalizedRole,
            CanEdit = normalizedRole == Roles.Lecturer
        };

        var room = rooms.AddUser(roomId, user);
        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
        await Clients.Group(roomId).SendAsync("UserJoined", user);
        await Clients.Group(roomId).SendAsync("ParticipantsUpdated", rooms.GetParticipants(roomId));

        return new
        {
            user,
            participants = rooms.GetParticipants(roomId),
            globalEdit = room.GlobalEdit
        };
    }
}

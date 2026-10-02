using CodeLive.Api.Models;
using CodeLive.Api.Services;
using Microsoft.AspNetCore.SignalR;

namespace CodeLive.Api.Hubs;

public class CollaborationHub(IRoomService rooms, ICodeExecutionService executor, ILogger<CollaborationHub> logger) : Hub
{
    public const int MaxSharedOutputLength = 20_000;

    public async Task JoinRoom(string roomId, string name, string role)
    {
        roomId = (roomId ?? "").Trim();
        if (roomId.Length is 0 or > 64) throw new HubException("Invalid room id.");
        name = string.IsNullOrWhiteSpace(name) ? "Anonymous" : name.Trim()[..Math.Min(name.Trim().Length, 40)];

        var normalizedRole = Roles.Normalize(role);
        var user = new User
        {
            ConnectionId = Context.ConnectionId,
            Name = name,
            Role = normalizedRole,
            CanEdit = normalizedRole == Roles.Lecturer,
        };

        var room = rooms.AddUser(roomId, user);
        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
        logger.LogInformation("{Name} ({Role}) joined room {Room}", name, normalizedRole, roomId);

        var participants = rooms.GetParticipants(roomId);
        await Clients.Caller.SendAsync("RoomState", new RoomStateDto(roomId, room.GlobalEdit, participants, user));
        await Clients.OthersInGroup(roomId).SendAsync("ParticipantsUpdated", participants);
    }

    public async Task ToggleGlobalEdit(string roomId, bool enabled)
    {
        EnsureLecturer(roomId);
        rooms.SetGlobalEdit(roomId, enabled);
        await Clients.Group(roomId).SendAsync("GlobalEditChanged", enabled);
    }

    public Task GrantEdit(string roomId, string targetConnectionId) => SetEdit(roomId, targetConnectionId, true);

    public Task RevokeEdit(string roomId, string targetConnectionId) => SetEdit(roomId, targetConnectionId, false);

    public Task<CodeExecutionResponse> RunCode(string code, string language) =>
        executor.ExecuteAsync(new CodeExecutionRequest(code, language), Context.ConnectionAborted);

    public async Task ShareTerminal(string roomId, string output)
    {
        var lecturer = EnsureLecturer(roomId);
        output ??= "";
        if (output.Length > MaxSharedOutputLength) output = output[^MaxSharedOutputLength..];
        await Clients.OthersInGroup(roomId).SendAsync("SharedTerminalOutput", new { from = lecturer.Name, output });
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        foreach (var roomId in rooms.GetRoomsForConnection(Context.ConnectionId))
        {
            rooms.RemoveUser(roomId, Context.ConnectionId);
            await Clients.Group(roomId).SendAsync("ParticipantsUpdated", rooms.GetParticipants(roomId));
        }
        await base.OnDisconnectedAsync(exception);
    }

    private async Task SetEdit(string roomId, string targetConnectionId, bool canEdit)
    {
        EnsureLecturer(roomId);
        var target = rooms.SetUserEdit(roomId, targetConnectionId, canEdit)
                     ?? throw new HubException("Participant not found.");
        if (target.Role == Roles.Lecturer && !canEdit) { target.CanEdit = true; throw new HubException("Cannot revoke a lecturer."); }

        await Clients.Client(targetConnectionId).SendAsync("EditPermissionChanged", canEdit);
        await Clients.Group(roomId).SendAsync("ParticipantsUpdated", rooms.GetParticipants(roomId));
    }

    private User EnsureLecturer(string roomId)
    {
        var user = rooms.GetUser(roomId, Context.ConnectionId);
        if (user is null || user.Role != Roles.Lecturer)
            throw new HubException("Only the lecturer can perform this action.");
        return user;
    }
}


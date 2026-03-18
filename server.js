// Legends Legacy - Multiplayer Server
const { Server } = require("socket.io");
const http = require("http");
const httpServer = http.createServer();

// Create Socket.IO server
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Game state
const gameState = {
    players: {},
    mapData: {
        width: 100,
        height: 100,
        TILE_SIZE: 50,
        spawnX: 2500,
        spawnY: 2500
    }
};

// Player management
function createPlayer(id, data) {
    return {
        id: id,
        x: data?.x || gameState.mapData.spawnX,
        y: data?.y || gameState.mapData.spawnY,
        width: 32,
        height: 32,
        speed: 5,
        color: data?.color || getRandomColor(),
        direction: data?.direction || 'down',
        isMoving: false,
        name: data?.name || `Player ${Object.keys(gameState.players).length + 1}`,
        connected: true
    };
}

function getRandomColor() {
    const colors = ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c', '#e67e22', '#34495e'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Socket.IO connection handling
io.on("connection", (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Send initial game state to new player
    socket.emit("init", {
        playerId: socket.id,
        mapData: gameState.mapData,
        players: gameState.players
    });

    // Handle new player joining
    socket.on("playerJoin", (data) => {
        const player = createPlayer(socket.id, data);
        gameState.players[socket.id] = player;
        
        // Broadcast new player to all other players
        socket.broadcast.emit("playerJoined", player);
        
        console.log(`${player.name} joined the game`);
    });

    // Handle player movement
    socket.on("playerMove", (data) => {
        const player = gameState.players[socket.id];
        if (player) {
            player.x = data.x;
            player.y = data.y;
            player.direction = data.direction;
            player.isMoving = data.isMoving;
            
            // Broadcast position update to all other players
            socket.broadcast.emit("playerMoved", {
                id: socket.id,
                x: data.x,
                y: data.y,
                direction: data.direction,
                isMoving: data.isMoving
            });
        }
    });

    // Handle player state updates
    socket.on("playerUpdate", (data) => {
        const player = gameState.players[socket.id];
        if (player) {
            Object.assign(player, data);
            socket.broadcast.emit("playerUpdated", {
                id: socket.id,
                ...data
            });
        }
    });

    // Handle chat messages
    socket.on("chatMessage", (data) => {
        const player = gameState.players[socket.id];
        if (player) {
            io.emit("chatMessage", {
                playerId: socket.id,
                playerName: player.name,
                message: data.message,
                timestamp: Date.now()
            });
        }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
        console.log(`Player disconnected: ${socket.id}`);
        
        const player = gameState.players[socket.id];
        if (player) {
            console.log(`${player.name} left the game`);
        }
        
        // Remove player from game state
        delete gameState.players[socket.id];
        
        // Broadcast player removal to all clients
        io.emit("playerLeft", socket.id);
    });

    // Handle ping for latency measurement
    socket.on("ping", (timestamp) => {
        socket.emit("pong", timestamp);
    });
});

// Get port from environment or use 3000
const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Legends Legacy Multiplayer Server running on port ${PORT}`);
});


// Export for potential module use
module.exports = { io, gameState };

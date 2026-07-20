const Network = {
    peer: null,
    conn: null,
    isHost: false,
    peerId: null,
    onConnectCallback: null,
    onDataCallback: null,

    // Initializes peer connection
    init(onIdCallback) {
        // Creating Peer with no arguments connects to PeerJS public cloud signaling server
        this.peer = new Peer();

        this.peer.on('open', (id) => {
            this.peerId = id;
            console.log('PeerJS client opened with ID: ' + id);
            if (onIdCallback) onIdCallback(id);
        });

        // Host receives a connection request from a guest player
        this.peer.on('connection', (connection) => {
            if (this.conn) {
                // Reject connections if a game is already in progress
                connection.on('open', () => {
                    connection.send({ type: 'LOBBY_FULL', payload: {} });
                    setTimeout(() => connection.close(), 1000);
                });
                return;
            }
            this.isHost = true;
            this.conn = connection;
            this.setupConnection();
        });

        this.peer.on('error', (err) => {
            console.error('PeerJS Connection Error: ', err);
        });
    },

    hostGame(onConnect) {
        this.isHost = true;
        this.onConnectCallback = onConnect;
    },

    joinGame(targetId, onConnect) {
        this.isHost = false;
        this.onConnectCallback = onConnect;
        console.log("Dialing host " + targetId + "...");
        this.conn = this.peer.connect(targetId);
        this.setupConnection();
    },

    setupConnection() {
        this.conn.on('open', () => {
            console.log('Multiplayer tunnel established.');
            if (this.onConnectCallback) {
                this.onConnectCallback();
            }
        });

        this.conn.on('data', (data) => {
            if (this.onDataCallback) {
                this.onDataCallback(data);
            }
        });

        this.conn.on('close', () => {
            console.warn('Co-op partner has disconnected.');
            alert('Co-op partner disconnected.');
            window.location.reload();
        });

        this.conn.on('error', (err) => {
            console.error('Socket tunnel error: ', err);
        });
    },

    send(type, payload) {
        if (this.conn && this.conn.open) {
            this.conn.send({ type, payload });
        }
    }
};

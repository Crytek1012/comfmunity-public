import { Db, MongoClient, MongoClientOptions } from "mongodb";
import ConnectionManager from "../structures/managers/connection-manager.js";
import AuthorityManager from "../structures/managers/authority-manager.js";
import RelayManager from "../structures/managers/relay-manager.js";
import { config } from "../config.js";
import client from "./client.js";
import { AuthorityLevel } from "../structures/authority.js";
import BanManager from "../structures/managers/ban-manager.js";

class Database {
    private readonly _client: MongoClient;
    private readonly _db: Db;
    private readonly _connections: ConnectionManager;
    private readonly _authorities: AuthorityManager;
    private readonly _relays: RelayManager;
    private readonly _bans: BanManager;

    constructor(options?: MongoClientOptions) {

        const uri = process.env.MONGO_URI;
        const dbName = process.env.MONGO_DB;
        if (!uri || !dbName) throw new Error('The value of MONGO_URI and MONGO_DB must not be null.')

        this._client = new MongoClient(uri, options);
        this._db = this._client.db(dbName);

        this._connections = new ConnectionManager(this._db.collection('connections'));
        this._authorities = new AuthorityManager(this._db.collection('authorities'));
        this._relays = new RelayManager(this._db.collection('relays'));
        this._bans = new BanManager(this._db.collection('bans'));

        this._db.collection('connections').createIndex({ guildId: 1 });
        this._db.collection('authorities').createIndex({ userId: 1 });
        this._db.collection('bans').createIndex({ userId: 1 });
        this._db.collection('relays').createIndexes([
            { key: { id: 1 } },
            { key: { ['messages.messageId']: 1 } }
        ]);
    };

    async connect() {
        await this._client.connect();

        // create owner authority
        const ownerAuthority = await this.authorities.fetch(config.ownerId);
        if (!ownerAuthority) {
            const user = client.users.cache.get(config.ownerId)!;
            await this.authorities.create({
                userId: config.ownerId,
                username: user.username,
                level: AuthorityLevel.Owner,
                createdTimestamp: Date.now(),
                hidden: false
            })
        }

        // cache connections
        await this.connections.fetchAll()
    }

    get connections() {
        return this._connections;
    }

    get authorities() {
        return this._authorities;
    }

    get relays() {
        return this._relays;
    }

    get bans() {
        return this._bans;
    }
}

const database = new Database();
export default database;
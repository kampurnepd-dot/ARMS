
const client = require("../client");

async function invalidateFlightCache() {
    let cursor = "0";

    do {
        const [nextCursor, keys] = await client.scan(
            cursor,
            "MATCH",
            "flight:*",
            "COUNT",
            100
        );

        cursor = nextCursor;

        if (keys.length > 0) {
            await client.del(...keys);
        }

    } while (cursor !== "0");

    console.log("Flight cache invalidated");
}

module.exports = {
    invalidateFlightCache,
    invalidateAirportCache
};

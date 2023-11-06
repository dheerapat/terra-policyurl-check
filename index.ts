import { CosmosClient } from "@azure/cosmos";
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
require("dotenv").config();

const connectionString: string = process.env.CONNECTION_STRING!
const client = new CosmosClient(connectionString);

async function main() {
    const { database } = await client.databases.createIfNotExists({ id: "rever-mdw-insurance-db-dev" });
    const { container } = await database.containers.createIfNotExists({ id: "rever-mdw-insurance-policy-dev" });
    const { resources: query } = await container.items.query("SELECT * FROM c").fetchAll();
    let data: any[] = [];

    for (let i = 0; i < 10; i++) {
        const id = query[i].id;
        const policyNumber = query[i].policy.policyNumber
        const Url = query[i].policy.policyDocumentUrl;
        let status;

        if (Url) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);

                const fetchPromise = fetch(Url, { signal: controller.signal });
                const response = await fetchPromise;

                clearTimeout(timeoutId); // Clear the timeout
                status = response.status
            } catch (error: any) {
                if (error.name === 'AbortError') {
                    status = "timed out";
                } else {
                    status = "other error";
                    console.error("Error ::::: " + "index " + i + " " + error);
                }
            }
        } else {
            status = "no url"
        }
        data.push({id : id, policyNumber: policyNumber, policyDocUrl: Url, urlStatus: status})
    }

    const csvWriter = createCsvWriter({
        path: 'data.csv',
        header: [
            {id: 'id', title: 'ID'},
            {id: 'policyNumber', title: 'Policy Number'},
            {id: 'policyDocUrl', title: 'Document URL'},
            {id: 'urlStatus', title: 'URL Status'}
        ]
    });

    csvWriter.writeRecords(data);

    return data;
}

main().then(data => {
    console.log(data);
}).catch(e => {
    console.log(e)
})
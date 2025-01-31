function initialise(parameters, requestor, die) {

    const request = requestor(0.24, e => {
        if (e.response.status === 429) die('The rate limit has been reached')
        if (e.response.status >= 400) return `Received code ${e.response.status}`
    })

    function locate(entries) {
        if (!parameters.ipAddressField) die('No IP address field found')
        const queries = entries.map(entry => {
            return entry[parameters.ipAddressField]
        })
        return {
            url: 'http://ip-api.com/batch',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: queries,
            passthrough: {
                entries
            }
        }
    }

    function parse(response) {
        return response.data.map(entry => {
            return {
                country: entry.countryCode,
                region: entry.regionName,
                city: entry.city,
                latitude: entry.lat,
                longitude: entry.lon,
                isp: entry.isp,
                organisation: entry.org
            }
        })
    }

    async function run(inputs) {
        const dataLocated = locate(inputs)
        const dataLocatedRequested = await request(dataLocated)
        const dataParsed = parse(dataLocatedRequested)
        return dataParsed
    }

    return run

}

const details = {
    batch: 100,
    parameters: [
        { name: 'ipAddressField', description: 'IP address column.' }
    ],
    columns: [
        { name: 'country' },
        { name: 'region' },
        { name: 'city' },
        { name: 'latitude' },
        { name: 'longitude' },
        { name: 'isp' },
        { name: 'organisation' }
    ]
}

export default { initialise, details }

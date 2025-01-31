import Cheerio from 'cheerio'

function initialise(parameters, requestor, die) {

    const request = requestor(1, e => {
        const term = e.config.passthrough.term
        if (e.response.status === 429) die('The rate limit has been reached')
        if (e.response.status >= 400) return `Received code ${e.response.status} for term "${term}"`
    })

    function locate(entry) {
        const term = entry[parameters.termField]
        if (!term) throw new Error('No term found')
        return {
            url: 'https://www.google.com/search',
            headers: {
                'User-Agent': 'Reconcile'
            },
            params: {
                q: parameters.supplement ? `${parameters.supplement} ${term}` : term
            },
            passthrough: {
                term
            }
        }
    }

    async function paginate(response, responses = []) {
        const document = Cheerio.load(response.data)
        const hasMorePages = document('[aria-label="Next page"]').length
        if (parameters.includeAll && hasMorePages) {
            const query = {
                url: response.url,
                headers: {
                    'User-Agent': 'Reconcile'
                },
                params: {
                    q: parameters.supplement ? `${parameters.supplement} ${term}` : response.passthrough.term,
                    start: (responses.length + 1) * 10
                },
                passthrough: {
                    term: response.passthrough.term
                }
            }
            return paginate(await request(query), responses.concat(response))
        }
        else return responses.concat(response)
    }

    function parse(response) {
        const document = Cheerio.load(response.data)
        const results = document('#main > div > div > div > a[href^="/url"]')
        if (results.length === 0) {
            const term = parameters.supplement ? `${parameters.supplement} ${term}` : response.passthrough.term
            throw new Error(`Could not find term "${term}"`)
        }
        return results.get().flatMap(result => {
            const element = Cheerio.load(result)
            if (element('h3').length === 0) return []
            const location = Cheerio(result).attr('href')
            return {
                resultTitle: element('h3').text().trim(),
                resultLocation: location.split('/url?q=')[1].split('&sa')[0]
            }
        })
    }

    async function run(input) {
        const dataLocated = locate(input)
        const dataLocatedRequested = await request(dataLocated)
        const dataLocatedPaginated = await paginate(dataLocatedRequested)
        const dataParsed = dataLocatedPaginated.flatMap(parse)
        return dataParsed
    }

    return run

}

const details = {
    parameters: [
        { name: 'termField', description: 'Term column.' },
        { name: 'supplement', description: 'Extra terms to be included with the search. [optional]' },
        { name: 'includeAll', description: 'Set true to include all URLs, instead of just the first. [optional, default is first page only]' }
    ],
    columns: [
        { name: 'resultTitle' },
        { name: 'resultLocation' }
    ]
}

export default { initialise, details }

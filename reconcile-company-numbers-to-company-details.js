const Highland = require('highland')
const Request = require('request')

const http = Highland.wrapCallback((location, callback) => {
    Request(location, (error, response) => {
        const failure = error ? error
              : response.statusCode === 404 ? new Error('Company not found: ' + location.query.companyNumber + ' (' + location.query.companyJuristiction + ')')
              : response.statusCode >=  400 ? new Error('Error ' + response.statusCode + ': ' + location.query.companyNumber + ' (' + location.query.companyJuristiction + ')')
              : null
        callback(failure, response)
    })
})

function locate(entry) {
    const apiVersion = 'v0.4.5'
    const location = 'https://api.opencorporates.com/' + apiVersion + '/companies'
          + '/' + entry.companyJuristiction.trim()
          + '/' + entry.companyNumber.trim()
          + (entry.apiToken ? '?api_token=' + entry.apiToken : '')
    return {
        uri: location,
        query: {
            companyNumber: entry.companyNumber,
            companyJuristiction: entry.companyJuristiction
        }
    }
}

function parse(response) {
    const body = JSON.parse(response.body)
    const company = body.results.company
    return {
        companyJuristiction: company.jurisdiction_code,
        companyNumber: company.company_number,
        companyName: company.name,
        companyIncorporationDate: company.incorporation_date,
        companyDissolutionDate: company.dissolution_date,
        companyType: company.company_type,
        companyStatus: company.current_status,
        companyAddress: company.registered_address_in_full.replace(/\n/g, ', '),
        companyPreviousNames: company.previous_names.map(name => name.company_name).join(', '),
        companyAlternativeNames: company.alternative_names.join(', '),
        companyAgentName: company.agent_name,
        companyAgentAddress: company.agent_address
    }
}

function run(input) {
    return new Promise((resolve, reject) => {
        Highland([input])
            .map(locate)
            .flatMap(http)
            .map(parse)
            .errors(reject)
            .each(resolve)
    })
}

module.exports = run

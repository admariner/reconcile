function initialise(parameters, requestor, die) {

    const request = requestor(2, e => {
        const company = e.config.passthrough.companyNumber
        if (e.response.status === 404) return `Could not find company ${company}`
        if (e.response.status === 429) die('The rate limit has been reached')
        if (e.response.status === 401) die(`API key ${e.config.auth.username} is invalid`)
        if (e.response.status >= 400) return `Received code ${e.response.status} for company ${company}`
    })

    function locate(entry) {
        const companyNumber = entry[parameters.companyNumberField || 'companyNumber']
        if (!companyNumber) throw new Error('No company number found')
        const url = `https://api.companieshouse.gov.uk/company`
            + '/' + companyNumber.trim()
        return {
            url,
            auth: {
                username: parameters.apiKey,
                password: ''
            },
            params: {
                items_per_page: 100
            },
            passthrough: {
                companyNumber
            }
        }
    }

    function parse(response) {
        const company = response.data
        return {
            companyName: company.company_name,
            companyUKJurisdiction: company.jurisdiction,
            companyCreationDate: company.date_of_creation,
            companyCessationDate: company.date_of_cessation,
            companyType: company.type,
            companySubtype: company.subtype,
            companyStatus: company.status,
            companyStatusDetail: company.status_detail,
            companyAddress: [company.registered_office_address.care_of, company.registered_office_address.premises, company.registered_office_address.po_box, company.registered_office_address.address_line_1, company.registered_office_address.address_line_2, company.registered_office_address.locality, company.registered_office_address.region, company.registered_office_address.postal_code, company.registered_office_address.country].filter(x => x).join(', '),
            companyAddressIsInDispute: company.registered_office_is_in_dispute,
            companyAddressIsUndeliverable: company.undeliverable_registered_office_address,
            companyPreviousNames: company.previous_company_names ? company.previous_company_names.map(name => `${name.name} (${name.effective_from} to ${name.ceased_on})`).join('; ') : null,
            companySICs: company.sic_codes ? company.sic_codes.join('; ') : null,
            companyCanFile: company.can_file,
            companyHasInsolvencyHistory: company.has_insolvency_history,
            companyHasCharges: company.has_charges,
            companyHasBeenLiquidated: company.has_been_liquidated,
            companyAccountsOverdue: company.accounts ? company.accounts.overdue : null,
            companyAnnualReturnOverdue: company.annual_return ? company.annual_return.overdue : null,
            companyPartialDataAvailable: company.partial_data_available,
            companyExternalRegistrationNumber: company.external_registration_number,
            companyLastFullMembersListDate: company.last_full_members_list_date
        }
    }

    async function run(input) {
        const dataLocated = locate(input)
        const dataLocatedRequested = await request(dataLocated)
        const dataParsed = parse(dataLocatedRequested)
        return dataParsed
    }

    return run

}

const details = {
    parameters: [
        { name: 'apiKey', description: 'A Companies House API key.' },
        { name: 'companyNumberField', description: 'Company number column. [optional, default: "companyNumber"]' }
    ],
    columns: [
        { name: 'companyName' },
        { name: 'companyUKJurisdiction' },
        { name: 'companyCreationDate' },
        { name: 'companyCessationDate' },
        { name: 'companyType' },
        { name: 'companySubtype' },
        { name: 'companyStatus' },
        { name: 'companyStatusDetail' },
        { name: 'companyAddress' },
        { name: 'companyAddressIsInDispute' },
        { name: 'companyAddressIsUndeliverable' },
        { name: 'companyPreviousNames' },
        { name: 'companySICs' },
        { name: 'companyCanFile' },
        { name: 'companyHasInsolvencyHistory' },
        { name: 'companyHasCharges' },
        { name: 'companyHasBeenLiquidated' },
        { name: 'companyAccountsOverdue' },
        { name: 'companyAnnualReturnOverdue' },
        { name: 'companyPartialDataAvailable' },
        { name: 'companyExternalRegistrationNumber' },
        { name: 'companyLastFullMembersListDate' }
    ]
}

module.exports = { initialise, details }

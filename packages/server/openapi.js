require('./apiSpecification/allSpecs');
const registry = require('./apiSpecification/registry');
const docUtil = require('./docUtil');

const resources = registry.where({
    type: 'resource'
}).filter(resource => !resource.path.startsWith('/bbr/'));

const handlers = registry.where({
    type: 'httpHandler'
});

const typeToSchema = parameterType => {
    if(parameterType === 'integer' ) {
        return { type: 'integer' };
    }
    if(parameterType === 'float') {
        return { type: 'number' };
    }
    return { type: 'string' }
}

const toOpenApiPath = (path, queryParameters, pathParameters ) => {
    pathParameters = pathParameters || [];
    const docPath = docUtil.expressPathToDocPath(path);
    const doc = docUtil.getDocForPath(docPath);
    const pathParams = docUtil.getPathParameterNames(docPath);
    return {
        get: {
            "description": doc.subtext,
            responses: {
                "200": {
                    "description": "Success response. Responsets MIME type afhænger af format parameteren."
                },
                "400": {
                    description: "Fejlkode 400 returneres hvis der er fejl i forespørgslen, e.g. ugyldige parametre."
                },
                "429": {
                    description: "Fejlkode 429 returneres hvis der er for mange forespørgsler fra samme IP-adresse, og DAWA ikke har tilstrækkelig kapacitet til at servicere forespørgslen. Klienten bør vente lidt og lave en ny forespørgsel."
                }
            }
        },
        parameters: [...queryParameters, ...pathParameters].map(param => {
            const paramDoc = doc.parameters.find(paramDoc => paramDoc.name === param.name);
            const isPathParam = pathParams.includes(param.name);
            // const schema = Object.assign({}, param.schema ? param.schema : typeToSchema(param.type));
            const schema = typeToSchema(param.type || 'string');
            delete schema.postgresql;
            delete schema.__$validated;
            const allowEmptyValue = param.type === 'boolean' || param.nullable;
            return {
                name: param.name,
                description: paramDoc ? paramDoc.doc : undefined,
                in: isPathParam ? 'path' : 'query',
                required: isPathParam || param.required || false,
                schema,
                allowEmptyValue
            };
        })
    };
};

const openApiJson = {
    "openapi": "3.0.0",
    "info": {
        "version": "1.0.0",
        "title": "DAWA - Danmarks Adressers Web API",
    },
    "servers": [
        {
            "url": "https://dawa.aws.dk"
        }
    ],
    "paths": [...resources, ...handlers].reduce((paths, resource) => {
        // this particular resource is not public documented
        if(resource.path === '/replikering/transaktioner/inspect') {
            return paths;
        }
        const docPath = docUtil.expressPathToDocPath(resource.path);
        paths[docPath] = toOpenApiPath(resource.path, resource.queryParameters, resource.pathParameters);
        return paths;
    }, {})
};

module.exports = {
    openApiJson
};

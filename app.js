/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const express = require('express'); // app server
const bodyParser = require('body-parser'); // parser for post requests
const Conversation = require('watson-developer-cloud/conversation/v1'); // watson sdk
const http = require('http');
const request = require('xhr-request')

const app = express();

// Bootstrap application settings
app.use(express.static('./public')); // load UI from public folder
app.use(bodyParser.json());

// Create the service wrapper
var conversation = new Conversation({
    // If unspecified here, the CONVERSATION_USERNAME and CONVERSATION_PASSWORD env properties will be checked
    // After that, the SDK will fall back to the bluemix-provided VCAP_SERVICES environment property
    // username: '<username>',
    // password: '<password>',
    // url: 'https://gateway.watsonplatform.net/conversation/api',
    version_date: Conversation.VERSION_DATE_2017_04_21
});

// Endpoint to be call from the client side
app.post('/api/message', function (req, res) {
    var workspace = process.env.WORKSPACE_ID || '<workspace-id>';
    if (!workspace || workspace === '<workspace-id>') {
        return res.json({
            'output': {
                'text': 'The app has not been configured with a <b>WORKSPACE_ID</b> environment variable. Please refer to the '
                + '<a href="https://github.com/watson-developer-cloud/conversation-simple">README</a> documentation on how to set this variable. <br>'
                + 'Once a workspace has been defined the intents may be imported from '
                + '<a href="https://github.com/watson-developer-cloud/conversation-simple/blob/master/training/car_workspace.json">here</a> in order to get a working application.'
            }
        });
    }
    var payload = {
        workspace_id: workspace,
        context: req.body.context || {},
        input: req.body.input || {}
    };

    // Send the input to the conversation service
    conversation.message(payload, function (err, data) {
        if ( err ) {
            return res.status( err.code || 500 ).json( err );
        }
        updateMessage( res, payload, data );
    });
});

/**
 * Updates the response text using the intent confidence
 * @param  {Object} res The node.js http response object
 * @param  {Object} input The request to the Conversation service
 * @param  {Object} response The response from the Conversation service
 * @return {Object}          The response with the updated message
 */
function updateMessage(res, input, response) {
    var acl = false;
    if (!response.output) {
        response.output = {};
    } else {
        if (response.intents && response.intents[0]) {
            var intent = response.intents[0];
            if(intent.intent === 'countries') { //TODO: evtl. intent.confidence
                getEUStaaten(res, response);
            } else if(intent.intent === 'capital') {
                getCapitalStaaten(res, response, response.entities[0]);
            } else {
                return res.json( response );
            }
        } else {
            return res.json( response );
        }
    }
};

/**
 * @name getCapitalStaaten - collect Capital for one Country
 * @param res
 * @param responseText
 * @param repsonse
 */
function getCapitalStaaten(res, response, entity){
    log(entity);
    var opt = {
        host: 'https://restcountries.eu',
        path: '/rest/v2/name/',
        get: 'Poland' //TODO
    };
    request(opt.host + opt.path + opt.get, {
        json: true
    }, function (err, country) {
        if (err) {
            console.error(err);
        } else {
            var respText = response.output.text + '';
            response.output.text = respText.replace('{capital}', country[0].capital);
            return res.json( response );
        }
    });
};
/**
 * @name getEUStaaten - collect all EU Countries
 * @param res
 * @param responseText
 * @param response
 */
function getEUStaaten(res, response) {
    var opt = {
        host: 'https://restcountries.eu',
        path: '/rest/v2/regionalbloc/',
        get: 'EU'
    };
    request(opt.host + opt.path + opt.get, {
        json: true
    }, function (err, countries) {
        if (err) {
            console.error(err);
        } else {
            let responseText = '';
            for(var i in countries){
                var country  = countries[i];
                if(country.name !== null){
                    responseText += (country.name + ' ');
                }
            }
            var respText = response.output.text + '';
            response.output.text = respText.replace('{countries}', responseText);
            log('before res.json', responseText);
            return res.json( response );
        }
    });
};

function log() {
    console.log('####: ', arguments);
};
module.exports = app;

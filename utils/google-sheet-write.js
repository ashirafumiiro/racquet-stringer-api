require('dotenv').config()
const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const axios = require('axios').default;

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';
const sheet_id = process.env.GOOGLE_SHEET_ID;

/**
 * Appends values in a Spreadsheet.
 * @param {string} spreadsheetId The spreadsheet ID.
 * @param {string} range The range of values to append/ sheet.
 * @param {object} valueInputOption Value input options.
 * @param {(string[])[]} _values A 2d array of values to append.
 * @return {obj} spreadsheet information
 */
 async function appendValues2(range, _values) {
    const spreadsheetId = sheet_id;
    const valueInputOption = "USER_ENTERED";
    const {google} = require('googleapis');
    const values = _values.map(x => x.map(y => JSON.stringify(y)));

  
    const auth = await getAuthenticated();
  
    const service = google.sheets({version: 'v4', auth});
    const resource = {
      values
    };
    try {
      const result = await service.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption,
        resource,
      });
      console.log(`${result.data.updates.updatedCells} cells appended.`);
      return result;
    } catch (err) {
      // TODO (developer) - Handle exception
      throw err;
    }
}

async function appendValues(type, _values) {
    let values = _values[0];
    const response = await post_to_app_script(values, type);
    return response;
}

function getAuthenticated() {
    return new Promise((resolve, reject) =>{
        // Load client secrets from a local file.
        fs.readFile('credentials.json', (err, content) => {
            if (err) reject(err);

            // Authorize a client with credentials, then call the Google Sheets API.
            let credentials = JSON.parse(content);
            const {client_secret, client_id, redirect_uris} = credentials.installed;
            const oAuth2Client = new google.auth.OAuth2(
                client_id, client_secret, redirect_uris[0]);

            // Check if we have previously stored a token.
            fs.readFile(TOKEN_PATH, (err, token) => {
                if (err) return getNewToken(oAuth2Client, resolve);
                oAuth2Client.setCredentials(JSON.parse(token));
                resolve(oAuth2Client);
            });
        });
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
 function getNewToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
      rl.close();
      oAuth2Client.getToken(code, (err, token) => {
        if (err) return console.error('Error while trying to retrieve access token', err);
        oAuth2Client.setCredentials(token);
        // Store the token to disk for later program executions
        fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
          if (err) return console.error(err);
          console.log('Token stored to', TOKEN_PATH);
        });
        callback(oAuth2Client);
      });
    });
  }

exports.appendShop = async (operation, shop) =>{
    try {
        var result = await appendValues("shop", [[operation, shop._id, shop.uuid, shop.name, shop.country, 
            JSON.stringify(shop.address), shop.email, shop.phone, Number(shop.enabled), shop.created, shop.updated, shop.created_by, 
            shop.etimated_delivery_time, shop.labor_price, shop.allow_own_strings,
            shop.stripe_customer_id, shop.stripe_subscription_id, shop.stripe_status,
        shop.stripe_account_id, shop.stripe_price_id, shop.comission, shop.subscripiton_expiry, shop.tax]]);
        console.log(`Append Shop Result:${result.statusText}`);
    }  catch(err){
        console.log("Erro in writing excel:", err);
    }
    
}

exports.appendAccount = async (operation, account) =>{
    try{
        var result = await appendValues("accounts", [[operation, account._id,account.uuid, 
            account.full_name, account.email, account.password, account.address, account.country, account.phone,
             account.provider, account.role, account.enabled, account.created, account.updated, account.shop]]);
        console.log(`Append Account Result:${result.statusText}`);
    }
    catch(err){
        console.log("Erro in writing excel:", err);
    }
    
}

exports.appendRacquet = async (operation, racquet) =>{
    try {
        var result = await appendValues("racquet", [[operation, racquet._id,racquet.uuid,racquet.account,"removed",
            racquet.brand,racquet.model,racquet.image_url,racquet.qr_code,racquet.mains,racquet.crosses,
            racquet.vibration_dampener,racquet.grip_brand,racquet.grip_model,racquet.grip_hand,racquet.created,racquet.updated,racquet.sport]])
        console.log(`Append Racquet Result:${result.statusText}`);
    } catch (err) {
        console.log("Erro in writing excel:", err);
    }
    
}

exports.appendString = async (operation, string) =>{
    try {
        var result = await appendValues("string", [[operation, string._id, string.uuid, string.type, string.brand, string.model, string.size, string.price, string.enabled, string.shop, string.created, 
            string.updated, string.hybrid_type, string.in_stock, string.tension]])
        console.log(`Append String Result:${result.statusText}`);
    } catch (err) {
        console.log("Erro in writing excel:", err);
    }
    
}

exports.appendProfile = async (operation, profile) =>{
    try {
        var result = await appendValues("profile", [[operation, profile._id,profile.uuid, profile.account, profile.birthday, profile.playing_level, profile.playing_hand, profile.playing_style, profile.hitting_style, 
            profile.pro_player_style_twin, profile.created, profile.updated]])
        console.log(`Append Profile Result:${result.statusText}`);
    } catch (err) {
        console.log("Erro in writing excel:", err);
    }
    
}

exports.appendOrder = async (operation, order) =>{
    try {
        var result = await appendValues("order", [[operation, order._id, order.uuid, order.account, order.racquet, order.string, 
            order.use_hybrid_settings, order.due_on, order.amount, order.payment_gateway_id, 
            order.transaction_id, order.status, order.type, order. delivery_type, order.delivery_shop, 
            order.delivery_address, order.delivery_date, order.created, order.updated ]])
        console.log(`Append Order Result:${result.statusText}`); 
    } catch (err) {
        console.log("Erro in writing excel:", err);
    }
    
}

async function post_to_app_script(data, type) {
    const url = process.env.APP_SCRIPT_URL;
    let command = "add";
    if(data[0] === "Updated"){
        command = "update";
    }
    var data = {
        command,
        type,
        data
    }
    var response = await axios.post(url, data);
    return {
        status: response.status,
        statusText: response.statusText
    }
}

exports.post_to_app_script = post_to_app_script;
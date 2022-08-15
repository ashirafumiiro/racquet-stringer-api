const maping = {0: 'operation', 1: '_id', 2: 'uuid', 3: 'name', 4: 'country', 5: 'address', 6: 'email', 7: 'phone', 8: 'enabled', 9: 'created', 10: 'updated', 11: 'created_by', 12: 'etimated_delivery_time', 13: 'labor_price', 14: 'allow_own_strings', 15: 'stripe_customer_id', 16: 'stripe_subscription_id', 17: 'stripe_status', 18: 'stripe_account_id', 19: 'stripe_price_id', 20: 'comission', 21: 'percentage_comission', 22: 'subscripiton_expiry', 23: 'tax'};

function doGet(e) {
  var ss = SpreadsheetApp.getActive();
  var rng = ss.getActiveSheet().getRange(2, 1, 10, 3)
  var vals = rng.getValues()
  Logger.log(vals)
  return ContentService.createTextOutput(JSON.stringify(vals)).setMimeType(ContentService.MimeType.JSON);
}

function rowEdited(e){
  const changedRow = e.range.rowStart;
  const changedColumn = e.range.columnStart;
  Logger.log(changedColumn);

  var spreadSheet = SpreadsheetApp.getActive();
  var watchColumns = [9,20,21,22];
  let isInList = watchColumns.includes(changedColumn);
  if(!isInList) //process only changes in a few columns
    return;

  var spreadSheet = SpreadsheetApp.getActive();
  var sheet = spreadSheet.getSheetByName("Shops");
  var rng = sheet.getRange(changedRow, 1, 1, sheet.getLastColumn());
  var vals = rng.getValues();
  var row = vals[0];
  var result = {};
  for(let i = 0; i<row.length; i++)
    result[maping[i]] = row[i];

  const id = result._id;
  const {enabled, stripe_price_id, comission, percentage_comission } = result;
  
  const payload = {
                    enabled: Boolean(enabled), 
                    percentage_comission,
                    stripe_price_id, 
                    comission, 
                  };

  var options = {
    'method' : 'patch',
    'headers': {
      "apikey": "d7715438-71aa-4c93-8eb8-a4ec9bab0768"
    },
    'payload' : payload
  };
  
  var add = 'https://racquet-stringer-api.herokuapp.com';
  var url = add +  '/api/v1/shops/' + id.replaceAll('"','');

  UrlFetchApp.fetch(url, options);
  Logger.log("Done Sending:" + url);

}

function getEntityRow(searchId, sheetName)
{
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName); 
    var column =2; //column Index(id)  
    var columnValues = sheet.getRange(2, column, sheet.getLastRow()).getValues(); //1st is header row
    var searchResult = columnValues.findIndex(searchId); //Row Index - 2

    if(searchResult != -1)
    {
        searchResult += 2 //is row index.
    }
    return searchResult;
}

Array.prototype.findIndex = function(search){
  if(search == "") return false;
  for (var i=0; i<this.length; i++){
    if (String(this[i]).includes(search)) return i;
  }
    

  return -1;
} 

function doPost(e) {

    var jsonString = e.postData.getDataAsString();
    var data = JSON.parse(jsonString)
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var timeStamp = new Date();
    // var time = Utilities.formatDate(timeStamp, "GMT+08:00", "MM/dd/yy, h:mm a");
    var entityType = data["type"];
    var commandType = data["command"];
    var entityData = data["data"];
    var sheetName = "";
    
    
    switch (entityType)  {
      case "shop":
        sheetName = "Shops";
        break;
      case "profile":       
        sheetName = "Profiles";
        break;
      case "order":
        sheetName = "Orders";
        break;
      case "string":
        sheetName = "Strings";
        break;
      case "accounts":
        sheetName = "Accounts";
        break;
      case "racquet":
        sheetName = "Racquets";
        break;
      default:
        sheetName = "Sheet7";
        break;
    }

    var sheet = ss.getSheetByName(sheetName);

    //Insert the data into the sheet  
    var values = [
      entityData
    ]
    var row = 0;
    if(commandType === "add"){
      var lastRow = sheet.getLastRow();
      row = lastRow+1;
    }
    else if(commandType == "update"){
      row = getEntityRow(entityData[1], sheetName);
      if(row === -1) row = lastRow +1;
      
    }
    var range = sheet.getRange(row, 1,1,entityData.length);
    range.setValues(values);

  Logger.log('Done setting values');
  return ContentService.createHtmlOutput(200);
}

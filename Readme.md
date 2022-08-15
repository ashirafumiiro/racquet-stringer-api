## Racquet stringer api
This is the repository for the Racquet stringer ApI

>NOTE: You must have **Node 16+ and npm** installed.

1- SSH into your server and install node and pm2  

```sh
sudo apt-get install nodejs

```
2- Install pm2  

```sh
sudo npm install -g pm2
```

3- Copy the repository to your server and move into the repository
```sh
git clone  https://link/to/repo
cd racquetpass
```

4- Edit the .env file and make the changes below

 | Variable | Type | Description |
| --- | --- | --- |
| `PORT` | int | API key for making requests to the backend |
| `DATABASE_URL` | string | connect URI to your mongo instance |
| `API_KEY` | string | Auth API KEY to access the backend endpoints |
| `EMAIL_HOST` | string | Host of STMP provider|
| `EMAIL_USER` | string | username of STMP provider|
| `EMAIL_PASSWORD` | string | Password of STMP provider|
| `APP_SCRIPT_URL` | string | App Script deployment URL |
| `EMAIL_PORT` | string | Port of STMP provider|
| `TWILIO_VERIFY_SID` | string | Twilio SID for the verification service. it starts with VA... |
| `TWILIO_ACCOUNT_SID` | string | The account SID for the twilio account. it starts with AC... |
| `TWILIO_AUTH_TOKEN` | string | The twilio account Auth Token |
| `TWILIO_MESSAGE_SID` | string | twilio SMS message service SID. It starts with MG... |
| `STRIPE_SECRET_KEY` | string | stripe account secret key |
| `STRIPE_WEBHOOK_KEY` | string | webhook signing secret for the account |
| `STRIPE_WEBHOOK_KEY_2` | string | webhook signing secret for the connected account (connect) |

*Example*
```
API_KEY=371687a8-8006-4987-bbcf-29d41c56695b
```


5- Install  modules

```sh
npm install
```
6- start application

```sh
pm2 start index.js
```
7- The startup subcommand generates and configures a startup script to launch PM2 and its managed processes on server boots

```sh
pm2 startup systemd
```

### Setting up App Script.
1. Copy code from `appScript.js` in the root folder and paste it in the App Script extension of the desired script. The header lables of the sheets and the sheets will have to be manually created as in the sample sheet. This code assumes that they already exist.
2. create a deployment configured as a web application and Copy the url. This is the URL that is configured as the value for `APP_SCRIPT_URL` in the .env file
3. Lastly create a trigger for the `onEdit` event and select the deployment of choice and the function `rowEdited` to be run when this trigger is triggered.

### Stripe Setup
1. In the stripe setup, we need to add 2 hooks. One for the client stripe account (platform) and the second one for connected accounts. This is selected while adding the webhooks handlers.
2. The first one is given a url https://yourhostingdomain.com/api/v1/stripe-update and the value for `Listen to` is `Events on your account` in the radio button. you can add all events of `subscription` for this webhook. Copy the signing secret for this hook and set it as the value for `STRIPE_WEBHOOK_KEY`
3. The second webhook is given a value https://yourhostingdomain.com/api/v1/stripe-update2 and `Listen to` radio button set to `Event on Connected accounts`. The signing secret is copied after creation and set as the value for `STRIPE_WEBHOOK_KEY_2`. When adding this endpoint ensure that the events for `checkout` and `account` are selected.


# End
Angelinos subscription order solution is made of several shopify pages and an app that serves as an intermediary between Shopify and Recharge. 
App is deployed to Heroku. Url to app endpoints is stored in Shopify shop metafield recharge_api_url. Security key to call app endpoints are in
recharge_auth_key metafield.

App gets it's keys and Urls for calling Recharge api from the env file or from the env variables on Heroku.

INFO:

SECTIONS

product-plans-template.liquid has old js code

SNIPPETS

product-info.liquid has base product box
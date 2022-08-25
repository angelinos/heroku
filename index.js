//this app is deployed at https://angelinos.herokuapp.com/

/* *******************************************************************
In this file: get, add, update, delete subscriptions by calling recharge api

Last update: 07/15/2020
Developer  : sven.homan@gmail.com
********************************************************************* */

const express = require("express");
const request = require("request-promise");
const bodyparser = require("body-parser");
//const getRawBody = require("raw-body");
const cors = require("cors");
const app = express();
const dotenv = require("dotenv").config();
//const session = require("express-session");
const braintree = require("braintree");

const PORT = process.env.PORT;
let dev = false;
let test;
if (dev) {
  test = true;
} else {
  test = false;
}
let bulk_limit = 20;
let thisUrl = process.env.thisUrl;
let rootUrl = process.env.rechargeUrl.replace("/subscriptions", "");
let callCount = { update: 0, add: 0 };

//app.engine("handlebars", exphbs({ defaultLayout: "main" }));
//app.set("view engine", "handlebars");

app.use(bodyparser.urlencoded({ extended: false }));
app.use(bodyparser.json());
app.use(cors());

app.use(express.json());
app.options("*", cors());

const corsOptions = {
  //origin: "https://new.angelinos.com"
};

/*
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "YOUR-DOMAIN.TLD"); // update to match the domain you will make the request from
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
*/

const AUTH_KEY = process.env.AUTH_KEY;
if (test) console.log("key", AUTH_KEY);

//security
app.use((req, res, next) => {
  let auth_key = req.header("auth-key");
  //console.log("auth_key", auth_key);
  //logging functionality:
  let now = new Date().toString();
  let log = `${now}: ${req.method} ${req.url}`;

  if (auth_key === AUTH_KEY || auth_key === "secret") {
    if (test) console.log(log);
    next();
  } else {
    log = log + ", Access denied.";
    if (test) console.log(log);
    res.json({ message: "Access denied: Wrong key" });
  }
});

app.get("/", (req, res) => {
  res.send("Hello from Angelinos-Recharge App!");
});

let requestHeaders = {
  "X-Recharge-Access-Token": process.env.rc_api_token,
  "Content-Type": "application/json"
};

let requestHeaders2 = {
  "X-Recharge-Access-Token": process.env.rc_api_token,
  "Content-Type": "application/json",
  "Accept" : "application/json"
};

let requestHeadersShopify = {
  "X-Shopify-Access-Token": process.env.sh_api_token,
  "Content-Type": "application/json",
};
//Accept: "application/json"

let requestHeadersThis = {
  "Auth-Key": AUTH_KEY,
  Accept: "application/json",
  "Content-Type": "application/json",
};

app.get("/orders/fulfillments", (req, res) => {
  //console.log(req.header("auth-key"));
  let order_id = req.query.order_id;
  //GET /admin/api/2020-04/orders/#{order_id}/fulfillments.json
  let requestUrl = `https://angelinos-com.myshopify.com/admin/api/2020-04/orders/${order_id}/fulfillments.json`;
  if (test) console.log(requestUrl);
  if (test) console.log(requestHeadersShopify);
  request
    .get(requestUrl, { headers: requestHeadersShopify })
    .then((res1) => {
      res.send(res1);
    })
    .catch((error) => {
      //console.log("get order fulfillment error", error);
      console.log("get fulfillment error");
      res.status(error.statusCode).send(error.error_description);
    });
});

//get all subscriptions for some customer
app.get("/subscriptions", (req, res) => {
  //console.log(req.header("auth-key"));
  let rc_customer_id = req.query.rc_customer_id;
  let sh_customer_id = req.query.sh_customer_id;
  let requestUrl;
  if (rc_customer_id) {
    console.log("rc_customer_id", rc_customer_id);
    requestUrl = process.env.rechargeUrl + "?customer_id=" + rc_customer_id;
  } else {
    console.log("sh_customer_id", sh_customer_id);
    requestUrl =
      process.env.rechargeUrl + "?shopify_customer_id=" + sh_customer_id;
  }
  let payload = {
    //token: accessToken
  };
  if (test) console.log(requestUrl);
  request
    .get(requestUrl, { json: payload, headers: requestHeaders })
    .then((res1) => {
      console.log("get sub");
      res.send(res1);
    })
    .catch((error) => {
      console.log("get error");
      res.status(error.statusCode).send(error.error_description);
    });
});

//get onetimes (filter: after some date, address_id)
app.post("/subscriptions/onetimes", (req, res) => {
  let data = req.body;
  let address_id = data.address_id;
  let created_at_min = data.created_at_min.substring(0, 10);
  let requestUrl = rootUrl + "/onetimes";
  let payload = {
    address_id,
    created_at_min,
  };
  if (test) console.log(requestUrl, payload);
  request
    .get(requestUrl, { json: payload, headers: requestHeaders })
    .then((res1) => {
      if (test) console.log("get onetimes success");
      res.send(res1);
    })
    .catch((error) => {
      if (test) console.log("get onetimes error");
      res.status(error.statusCode).send(error.error_description);
    });
});

//get customer subscription count
app.get("/subscriptions/count", (req, res) => {
  //console.log(req.header("auth-key"));
  let sh_customer_id = req.query.customer_id;
  let requestUrl =
    process.env.rechargeUrl + "/count?shopify_customer_id=" + sh_customer_id;
  let payload = {
    //token: accessToken
  };
  if (test) console.log(requestUrl);
  request
    .get(requestUrl, { json: payload, headers: requestHeaders })
    .then((res1) => {
      console.log("get sub count", res1.count);
      res.send(res1);
    })
    .catch((error) => {
      console.log("get sub count error");
      res1.status(error.statusCode).send(error.error_description);
    });
});

//get discount
app.get("/subscriptions/discount", (req, res) => {
  //console.log(req.header("auth-key"));
  let discount_code = req.query.discount_code;
  let requestUrl =
    process.env.rechargeUrl.replace("subscriptions", "discounts") +
    "?discount_code=" +
    discount_code;
  let payload = {
    //token: accessToken
  };
  if (test) console.log("discounts url", requestUrl);
  request
    .get(requestUrl, { json: payload, headers: requestHeaders })
    .then((res1) => {
      console.log("get discounts", res1);
      res.send(res1);
    })
    .catch((error) => {
      console.log("get discount error");
      res1.status(error.statusCode).send(error.error_description);
    });
});

//get customer order count
app.get("/orders/count", (req, res) => {
  //console.log(req.header("auth-key"));
  let sh_customer_id = req.query.customer_id;
  let requestUrl =
    process.env.rechargeUrl.replace("subscriptions", "orders") +
    "/count?shopify_customer_id=" +
    sh_customer_id;
  let payload = {
    //token: accessToken
  };
  if (test) console.log("orders", requestUrl);
  request
    .get(requestUrl, { json: payload, headers: requestHeaders })
    .then((res1) => {
      console.log("get order count", res1.count);
      res.send(res1);
    })
    .catch((error) => {
      console.log("get order count error");
      res1.status(error.statusCode).send(error.error_description);
    });
});

//update
app.put("/subscriptions/upd/", (req, res) => {
  callCount.update++;
  let qty = req.body.quantity;
  let subid = req.body.subid;
  let name = req.body.name;
  if (test) console.log("upd call count", name, callCount.update);
  //if (test) console.log("upd", req.body);
  let requestUrl = process.env.rechargeUrl + "/" + subid;
  let payload = {
    quantity: qty,
  };
  if (test) console.log(requestUrl);
  request
    .put(requestUrl, { json: payload, headers: requestHeaders })
    .then((data) => {
      console.log("updated sub", name);
      callCount.update = 0;
      res.send(data);
    })
    .catch((error) => {
      console.log("update error", name);
      if (callCount.update < 4) {
        //make another call to itself
        setTimeout(function () {
          request
            .put(thisUrl + "/upd/", {
              json: req.body,
              headers: requestHeadersThis,
            })
            .then((data1) => {
              res.send(data1);
            })
            .catch((error1) => {
              data1.status(error1.statusCode).send(error1.error_description);
            });
        }, 1000);
      } else {
        data
          .status(error.statusCode)
          .send("update call failed", error.error_description);
      }
    });
});

/* update sample data
    data = {     
    "product_title":"Sumatra Coffee",
    "price":12.5,
    "quantity":1,
    "shopify_variant_id":3844924611,
    "sku_override": false,
    "order_interval_unit":"day",
    "order_interval_frequency":"30",
    "expire_after_specific_number_of_charges": 2,
    "charge_interval_frequency":"30",
*/

//add
app.post("/subscriptions/add/", (req, res) => {
  callCount.add++;
  let data = req.body;
  if (test) console.log("add call count", data.name, callCount.add);
  if (test) console.log("add", data);
  let requestUrl = process.env.rechargeUrl;
  let payload = data;
  if (test) console.log(requestUrl);
  //console.log(payload);
  request
    .post(requestUrl, { json: payload, headers: requestHeaders })
    .then((res1) => {
      console.log("added sub", data.name);
      callCount.add = 0;
      res.send(res1);
    })
    .catch((error) => {
      console.log("add error", data.name);
      if (callCount.add < 4) {
        //make another call to itself
        setTimeout(function () {
          request
            .post(thisUrl + "/add/", {
              json: req.body,
              headers: requestHeadersThis,
            })
            .then((data1) => {
              res.send(data1);
            })
            .catch((error1) => {
              data1.status(error1.statusCode).send(error1.error_description);
            });
        }, 1000);
      } else {
        res1
          .status(error.statusCode)
          .send("add call failed", error.error_description);
      }
    });
});

/* add sample data
    "address_id":21317826,
    "next_charge_scheduled_at":"2018-12-10", ?    
    "product_title":"Sumatra Coffee", opt
    "price":12.5, opt
    "quantity":1,
    "shopify_variant_id":3844924611,
    "sku_override": false, ?
    "order_interval_unit":"day", ?
    "order_interval_frequency":"30", ?
    "expire_after_specific_number_of_charges": 2, ?
    "charge_interval_frequency":"30", ?
    */

//delete
app.delete("/subscriptions/del/", (req, res) => {
  let subid = req.body.subid;
  //if (test) console.log("del subid: ", subid);
  let requestUrl = process.env.rechargeUrl + "/" + subid;
  let payload = {
    //key: shop,
    //token: accessToken
  };
  //console.log(requestUrl);
  request
    .delete(requestUrl, { json: payload, headers: requestHeaders })
    .then((res1) => {
      if (test) console.log("deleted sub");
      res.send(res1);
    })
    .catch((error) => {
      if (test) console.log("delete error");
      res1.status(error.statusCode).send(error.error_description);
    });
});

/*
    function swapSub(new_variant_id, subid){
      let data;
      $.ajax({
          type: "PUT",
          crossDomain: true,
          url : sp.rcURL + subid,
          headers: sp.headers,
          data: data,
          dataType: 'json'            
      });     
    }
*/

/* swap data = {
    "shopify_variant_id": 29602606710872,
    "quantity": 2,
    "next_charge_scheduled_at": "2019-12-15",
    "order_interval_frequency": "2",
    "order_interval_unit": "month",
    "charge_interval_frequency": "2"
  }
*/

//clone order
app.post("/orders/clone/", (req, res) => {
  //callCount.add++;
  let data = req.body;
  //if (test) console.log("add call count", data.name, callCount.add);
  if (test) console.log("orders/clone", data);
  //let requestUrl = process.env.rechargeUrl;
  let requestUrl =
    process.env.rechargeUrl.replace("/subscriptions", "") + data.url;
  let payload = { scheduled_at: data.scheduled_at };
  let requestBody = { json: payload, headers: requestHeaders };
  if (test) console.log(requestUrl, requestBody);
  request
    .post(requestUrl, { json: payload, headers: requestHeaders })
    .then((res1) => {
      if (test) console.log("order cloned id:", res1.order.id);
      //console.log(res1);
      res.send(res1);
    })
    .catch((error) => {
      if (test) console.log("order clone error");
      res.status(error.statusCode).send(error.error_description);
    });
});

//delete subscriptions bulk
app.post("/subscriptions/delete-bulk/", (req, res) => {
  let data = req.body;
  if (test) console.log("subscriptions/bulk delete", data);
  //let requestUrl = process.env.rechargeUrl;
  let requestUrl =
    process.env.rechargeUrl.replace("/subscriptions", "") + data.url;
  let payload = { subscriptions: data.subscriptions };
  let requestBody = { json: payload, headers: requestHeaders };
  if (test) console.log(requestUrl, requestBody);
  //return 0;
  request
    .delete(requestUrl, { json: payload, headers: requestHeaders })
    .then((res1) => {
      if (test) console.log("bulk-delete success");
      //console.log(res1);
      res.send(res1);
    })
    .catch((error) => {
      if (test) console.log("bulk-delete error");
      res.status(error.statusCode).send(error.error_description);
    });
});

//create subscriptions bulk
app.post("/subscriptions/create-bulk/", (req, res) => {
  let data = req.body;
  if (test) console.log("subscriptions/bulk create", data);
  //let requestUrl = process.env.rechargeUrl;
  let requestUrl =
    process.env.rechargeUrl.replace("/subscriptions", "") + data.url;
  let payload = { subscriptions: data.subscriptions };
  let requestBody = { json: payload, headers: requestHeaders };
  if (test) console.log(requestUrl, requestBody);
  //return 0;
  request
    .post(requestUrl, { json: payload, headers: requestHeaders })
    .then((res1) => {
      if (test) console.log("bulk-create success");
      //console.log(res1);
      res.send(res1);
    })
    .catch((error) => {
      if (test) console.log("bulk-create error");
      res.status(error.statusCode).send(error.error_description);
    });
});

//update all subscriptions
app.post("/subscriptions/update-all/", async (req, res) => {
  let data = req.body;
  //if (test) console.log("subscriptions/update-all", data);
  let root = process.env.rechargeUrl.replace("/subscriptions", "");

  //1. subscriptions delete in bulk
  //let requestUrl = root + data.final_urls.del;
  let requestUrl = `${root}/addresses/${data.address_id}/subscriptions-bulk`;
  let arr_del = data.subscriptions.del;
  let arr1 = [];
  let arr2 = [];
  let i = 0;
  for (let item of arr_del) {
    i++;
    if (i < bulk_limit + 1) {
      arr1.push(item);
    } else {
      arr2.push(item);
    }
  }
  let payload = { subscriptions: arr1 };
  //let requestBody = { json: payload, headers: requestHeaders };
  //if (test) console.log(requestUrl, requestBody);
  await request
    .delete(requestUrl, { json: payload, headers: requestHeaders })
    .then((res1) => {
      console.log("bulk-delete success", arr1.length);
      //console.log(res1);
      //res.send(res1);
    })
    .catch((error) => {
      console.log("bulk-delete error");
      res.status(error.statusCode).send(error.error_description);
    });

  if (arr2.length > 0) {
    payload = { subscriptions: arr2 };
    await request
      .delete(requestUrl, { json: payload, headers: requestHeaders })
      .then((res1) => {
        console.log("bulk-delete 2 success", arr2.length);
        //console.log(res1);
        //res.send(res1);
      })
      .catch((error) => {
        console.log("bulk-delete 2 error");
        res.status(error.statusCode).send(error.error_description);
      });
  }

  //2. subscriptions create in bulk
  i = 0;
  let arr_add = data.subscriptions.add;
  arr1 = [];
  arr2 = [];
  for (let item of arr_add) {
    i++;
    if (i < bulk_limit + 1) {
      arr1.push(item);
    } else {
      arr2.push(item);
    }
  }
  //requestUrl = root + data.final_urls.add;
  requestUrl = `${root}/addresses/${data.address_id}/subscriptions-bulk`;
  payload = { subscriptions: arr1 };
  await request
    .post(requestUrl, { json: payload, headers: requestHeaders })
    .then((res1) => {
      console.log("bulk-create success", arr1.length);
      //console.log(res1);
      //res.send(res1);
    })
    .catch((error) => {
      console.log("bulk-create error");
      res.status(error.statusCode).send(error.error_description);
    });

  if (arr2.length > 0) {
    payload = { subscriptions: arr2 };
    await request
      .post(requestUrl, { json: payload, headers: requestHeaders })
      .then((res1) => {
        console.log("bulk-create 2 success", arr2.length);
        //console.log(res1);
        //res.send(res1);
      })
      .catch((error) => {
        console.log("bulk-create 2 error");
        res.status(error.statusCode).send(error.error_description);
      });
  }

  //3. delete onetimes - loop
  let onetimes = data.onetimes.del;
  //console.log("arr", onetimes);
  for (item of onetimes) {
    requestUrl = `${root}/onetimes/${item.id}`;
    console.log(requestUrl);
    payload = {};
    await request
      .delete(requestUrl, { json: payload, headers: requestHeaders })
      .then((res1) => {
        console.log("onetime delete success", 1);
        //console.log(res1);
        //res.send(res1);
      })
      .catch((error) => {
        console.log("onetime delete error");
        res.status(error.statusCode).send(error.error_description);
      });
  }

  //4. add onetimes - loop
  requestUrl = `${root}/addresses/${data.address_id}/onetimes`;
  onetimes = data.onetimes.add;
  console.log("arr", onetimes);
  for (item of onetimes) {
    payload = item;
    await request
      .post(requestUrl, { json: payload, headers: requestHeaders })
      .then((res1) => {
        console.log("onetime create success", 1);
        //console.log(res1);
        //res.send(res1);
      })
      .catch((error) => {
        console.log("onetime create error");
        res.status(error.statusCode).send(error.error_description);
      });
  }
  res.status(200).send("OK");
});

//TEST
//get customer from recharge
app.post("/subscriptions/customer/", async (req, res) => {
  let data = req.body;
  if (test) console.log("subscriptions/customer", data);
  //let requestUrl = process.env.rechargeUrl;
  let requestUrl =
    process.env.rechargeUrl.replace("/subscriptions", "") + data.final_url;
  let payload = {};
  let requestBody = { json: payload, headers: requestHeaders };
  if (test) console.log(requestUrl, requestBody);
  //return 0;
  request
    //.post(requestUrl, { json: payload, headers: requestHeaders })
    .get(requestUrl, { headers: requestHeaders })
    .then((res1) => {
      console.log("get customer success");
      console.log(res1);
      res.send(res1);
    })
    .catch((error) => {
      console.log("get customer error");
      res.status(error.statusCode).send(error.error_description);
    });
});

//get customer payment sources from recharge
app.post("/subscriptions/customer/payment_sources", async (req, res) => {
  let data = req.body;
  if (test) console.log("subscriptions/customer/payment_sources", data);
  //let requestUrl = process.env.rechargeUrl;
  let requestUrl =
    process.env.rechargeUrl.replace("/subscriptions", "") + data.final_url;
  let payload = {};
  let requestBody = { json: payload, headers: requestHeaders };
  if (test) console.log(requestUrl, requestBody);
  //return 0;
  request
    //.post(requestUrl, { json: payload, headers: requestHeaders })
    .get(requestUrl, { headers: requestHeaders })
    .then((res1) => {
      console.log("get customer payment sources success");
      console.log(res1);
      res.send(res1);
    })
    .catch((error) => {
      console.log("get customer payment sources error");
      res.status(error.statusCode).send(error.error_description);
    });
});

//get customer addresses from recharge
app.post("/subscriptions/customer/addresses", async (req, res) => {
  let data = req.body;
  if (test) console.log("subscriptions/customer/addresses", data);
  //let requestUrl = process.env.rechargeUrl;
  let requestUrl =
    process.env.rechargeUrl.replace("/subscriptions", "") + data.final_url;
  let payload = {};
  let requestBody = { json: payload, headers: requestHeaders };
  if (test) console.log(requestUrl, requestBody);
  //return 0;
  request
    //.post(requestUrl, { json: payload, headers: requestHeaders })
    .get(requestUrl, { headers: requestHeaders })
    .then((res1) => {
      console.log("get customer addresses success");
      console.log(res1);
      res.send(res1);
    })
    .catch((error) => {
      console.log("get customer addresses error");
      res.status(error.statusCode).send(error.error_description);
    });
});

//get Recharge discount(s)
app.post("/subscriptions/discounts", async (req, res) => {
  let data = req.body;
  if (test) console.log("subscriptions/discounts", data);
  let requestUrl =
    process.env.rechargeUrl.replace("/subscriptions", "") + data.final_url;
  let payload = {};
  let requestBody = { json: payload, headers: requestHeaders };
  if (test) console.log(requestUrl, requestBody);
  //return 0;
  request
    .get(requestUrl, { headers: requestHeaders })
    .then((res1) => {
      console.log("get recharge discount success");
      //console.log(res1);
      res.send(res1);
    })
    .catch((error) => {
      console.log("get recharge discount error");
      res.status(error.statusCode).send(error.error_description);
    });
});

// create recharge checkout
app.post("/subscriptions/checkout/add", async (req, res) => {
  let data = req.body;
  if (test) console.log("subscriptions/checkout/add", data);
  //let requestUrl = process.env.rechargeUrl;
  let requestUrl =
    process.env.rechargeUrl.replace("/subscriptions", "") + data.final_url;
  let payload = data.data;
  let requestBody = { json: payload, headers: requestHeaders };
  if (test) console.log(requestUrl, requestBody);
  //return 0;
  await request
    .post(requestUrl, { json: payload, headers: requestHeaders })
    //.get(requestUrl, { headers: requestHeaders })
    .then((res1) => {
      console.log("create checkout success");
      //console.log(res1);
      res.send(res1);
    })
    .catch((error) => {
      console.log("create checkout error");
      res.status(error.statusCode).send(error.error_description);
    });
});

// update recharge checkout
app.post("/subscriptions/checkout/update", async (req, res) => {
  let data = req.body;
  if (test) console.log("subscriptions/checkout/update", data);
  //let requestUrl = process.env.rechargeUrl;
  let requestUrl =
    process.env.rechargeUrl.replace("/subscriptions", "") + data.final_url;
  let payload = data.data;
  let requestBody = { json: payload, headers: requestHeaders };
  if (test) console.log(requestUrl, requestBody);
  //return 0;
  await request
    .put(requestUrl, { json: payload, headers: requestHeaders })
    //.get(requestUrl, { headers: requestHeaders })
    .then((res1) => {
      console.log("update checkout success");
      //console.log(res1);
      res.send(res1);
    })
    .catch((error) => {
      console.log("update checkout error");
      res.status(error.statusCode).send(error.error_description);
    });
});

// process recharge checkout
app.post("/subscriptions/checkout/process", async (req, res) => {
  let data = req.body;
  let payload = {};
  let requestUrl;
  console.log(data); 
  /* comming in
  data.data = {
      "payment_processor": sp.payment_processor,
      "payment_token": sp.payment_token,  //not real payment token - need to get below
      "payment_type": sp.payment_type,
    };
  */
  let cust_id = data.data.payment_token;
  if(data.data.payment_processor === "braintree"){
    //documentation for braintree sdk
    //https://developers.braintreepayments.com/reference/request/payment-method-nonce/create/node
    //https://developers.braintreepayments.com/start/hello-server/node
    //console.log(process.env.braintree_PrivateKey);
    //*
    let gateway = braintree.connect({
      environment: braintree.Environment.Production,
      merchantId: "h9smwz5jxtjgk6vs",
      publicKey: "v3b5rr8qym73w53y",
      privateKey: "c243aeed3625a66b6e791d9881bcc08e"
    });
   /*/

    //* not working
    let gateway = braintree.connect({
      environment: braintree.Environment.Production,
      merchantId: process.env.braintree_MerchantId,
      publicKey: process.env.braintree_PublicKey,
      privateKey: process.env.braintree_PrivateKey
    });
    //*/
    //return;
      
    gateway.customer.find(cust_id, function(err, customer) {
      //console.log(customer);
      customer.paymentMethods.forEach(paymentMethod => {
        if (paymentMethod.default){
          //console.log(paymentMethod);
          gateway.paymentMethodNonce.create(paymentMethod.token, function(err, response) {
            let nonce = response.paymentMethodNonce.nonce;
            //console.log(nonce);
            
            //checkout process
            data.data.payment_token = nonce;
            payload = data.data;
            requestUrl = process.env.rechargeUrl.replace("/subscriptions", "") + data.final_url;
            if (test) console.log(requestUrl, payload, requestHeaders);
            //return 0;
            request
              .post(requestUrl, { json: payload, headers: requestHeaders })
              .then((res1) => {
                console.log("process checkout success");
                console.log(res1);
                res.send(res1);
              })
              .catch((error) => {
                console.log("process checkout error", error.message);
                res.status(error.statusCode).send(error.message);
              });
          });
        };
      });
    });

    //alternative code

    //call braintree and get customer token
    /*
    let clientToken;
    clientToken = await gateway.clientToken.generate({customerId: cust_id});
    console.log('c-token', clientToken);
    res.send('ok'); //
    */
    /*
    await gateway.clientToken.generate({
      customerId: cust_id
    }, function (err, response) {
      clientToken = response.clientToken
    });
    */
    //let customer = await gateway.Customer.FindAsync(cust_id);
    //clientToken = customer.DefaultPaymentMethod.Token;
    
    //call braintree and get real one time payment token (nounce)
    /*
    let result = await gateway.PaymentMethodNonce.Create(clientToken);
    let paymentToken = result.Target.Nonce;
    console.log('p-token', payment_token);
    res.send('ok'); //
    */

    //replace code with direct call to braintree
    /*
    requestUrl = `https://angelinos-shopify-api.azurewebsites.net/api/shopify/BraintreeNonce/${cust_id}`;
    console.log(requestUrl);
    await request
    .get(requestUrl, { headers: {} })
    .then((res0) => {
      console.log("braintree nonce", res0);
      payment_token = res0;
    })
    .catch((error) => {
      console.log("get braintree nonce error");
      res.status(error.statusCode).send(error.error_description);
    });
    */
  }else{
    //stripe?, abort?
    //payment_token = "tok_visa" for testing stripe
    console.log('charge aborted');
    res.send("charge aborted");
  }
 /*
  data.data.payment_token = payment_token;
  payload = data.data;
  requestUrl = process.env.rechargeUrl.replace("/subscriptions", "") + data.final_url;
  if (test) console.log(requestUrl, payload, requestHeaders);
  //return 0;
  await request
    .post(requestUrl, { json: payload, headers: requestHeaders })
    .then((res1) => {
      console.log("process checkout success");
      console.log(res1);
      res.send(res1);
    })
    .catch((error) => {
      console.log("process checkout error", error.body);
      res.status(error.statusCode).send(error.body);
    });
*/
});

app.listen(PORT, () => console.log(`Listening on ${PORT}`));
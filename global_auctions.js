/**
 * Gets the Auction URLs on the current page
 */
function getUrlsOnPage(){
    // Check to see if we are on a single auction page
    if (document.getElementsByClassName("CharacterView").length > 0){
        id = document.getElementsByClassName("InInputResetButton CipAjaxLink")[0].getAttribute("onclick").toString().split("Href: '")[1].split("&type")[0].split("auctionid=")[1]
        url = "https://www.tibia.com/charactertrade/?subtopic=currentcharactertrades&page=details&auctionid=" + id + "&source=overview"
        url = replace_url(url);
        return [url];
    }

    // Otherwise, get all of the auction pages
    var names = document.getElementsByClassName("AuctionCharacterName");
    var urls=[];
    var i;
    for (i = 0; i < names.length; i++){
        var url = names[i].getElementsByTagName("a")[0];
        if (url == null){
            continue;
        }
        url = url.getAttribute("href");
        url = replace_url(url);
        urls.push(url);
    }
    return urls;
}

/**
 * Extracts the auction id from an auction URL
 */
function auction_id_from_url(url){
    return url.split("&source=overview")[0].split("&auctionid=")[1]
}

/**
 * Normalizes a URL so it can be used as a key if necessary
 */
function replace_url(url){
    url = url.replace("subtopic=pastcharactertrades", "subtopic=currentcharactertrades")
        .replace("subtopic=ownbids", "subtopic=currentcharactertrades")
        .replace("subtopic=owncharactertrades", "subtopic=currentcharactertrades")
        .replace("subtopic=watchedcharactertrades", "subtopic=currentcharactertrades")
        .replace("subtopic=charactertrades", "subtopic=currentcharactertrades");
    return url;
}

/**
 * Finds the bid row HTML element for a given URL
 */
function bidRowByUrl(url){
    var auctions = document.getElementsByClassName("Auction");
    if (auctions.length == 1){
        return auctions[0].getElementsByClassName("ShortAuctionDataBidRow")[0];
    }
    var idx = "";
    for (i = 0; i < auctions.length; i++){
        var links = auctions[i].getElementsByClassName("AuctionHeader")[0].getElementsByClassName("AuctionLinks")[0].getElementsByTagName("a")
        var auction_url = links[links.length - 1].getAttribute("href");
        auction_url = replace_url(auction_url);
        if (url == auction_url){
            return auctions[i].getElementsByClassName("ShortAuctionDataBidRow")[0];
        }
    }
    return null;
}

/**
 * Finds the previously created loading (...) element for each prediction, and replaces
 * it with a rounded prediction value.
 */
function appendPredictions(predictions){
    for (i = 0; i < predictions.length; i++){
        prediction_split = predictions[i].split(":")
        id = prediction_split[0];
        prediction_value = parseInt(prediction_split[1]);
        prediction_value = Math.round(prediction_value / 10) * 10;
        var prediction = document.getElementsByClassName("prediction_auction_id_" + id)[0];

        var world_name = prediction.parentNode.parentNode.parentNode.parentNode.parentNode.getElementsByClassName("AuctionHeader")[0].getElementsByTagName("a");
        world_name = world_name[world_name.length - 1].innerHTML;
        if (world_name == "Zunera" || world_name == "Zuna"){
            prediction.innerHTML = "N/A ";
            continue;
        }

        if (prediction_value <= 0){
            prediction.innerHTML = "N/A";
            continue;
        }

        prediction.innerHTML = prediction_value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " ";
        prediction.setAttribute("class", "prediction_auction_id_" + id)
    }
}

/**
 * For each auction (bid row), add the estimated value template with a distinct ID for each auction
 */
function appendLoading(url){
    var bid_row = null;
    
    bid_row = bidRowByUrl(url);
    auction_id = auction_id_from_url(url)
    
    var title = document.createElement("div");
    title.setAttribute("class", "ShortAuctionDataLabel");
    title.innerHTML = "Estimated Value:";
    title.setAttribute("style", "width: 10em;");

    var value_wrapper = document.createElement("div");
    value_wrapper.setAttribute("class", "ShortAuctionDataValue");

    var prediction = document.createElement("b");
    prediction.setAttribute("class", "prediction_auction_id_" + auction_id);
    prediction.innerHTML = "... ";

    var img = document.createElement("img");
    img.setAttribute("src", "https://static.tibia.com/images//account/icon-tibiacoin.png");
    img.setAttribute("class", "VSCCoinImages");
    img.setAttribute("title", "Transferable Tibia Coins");

    value_wrapper.appendChild(prediction);
    value_wrapper.appendChild(img);

    bid_row.appendChild(title);
    bid_row.appendChild(value_wrapper);
}

/**
 * Query backend server for all auction URLs on the page,
 * then append the predictions to the webpage.
 */
function get_predictions(){
    vm_instance_url = "<REMOVED>";
    urls = getUrlsOnPage();
    for (a = 0; a < urls.length; a++){
        appendLoading(urls[a].replaceAll("*", "&"));
    }

    var auction_ids = [];
    for (a = 0; a < urls.length; a++){
        var auction_id = auction_id_from_url(urls[a]);
        auction_ids.push(auction_id);
    }

    var complete_auction_string = auction_ids.join();
    var complete_url = vm_instance_url + "?auction_id=" + complete_auction_string + "&predict_all=true";
    $.ajax({
        type: 'GET',
        url: complete_url,
        success: function(data) {
            if (data == "NEED_PREDICTION"){
                var chunk_size = 2;
                for (a = 0; a < auction_ids.length; a+=chunk_size){
                    var auction_chunk = auction_ids.slice(a, a + chunk_size);
                    var auction_string = auction_chunk.join();
                    $.ajax({
                        type: 'GET',
                        url: vm_instance_url + "?auction_id=" + auction_string,
                        success: function(data) {
                            // console.log(data);
                            var entries = data.split("|");
                            appendPredictions(entries);   
                        }
                    })
                }
            } else {
                var entries = data.split("|");
                appendPredictions(entries);
            }
        }
    })
}

/**
 * Extracts the world name from a given auction header so it
 * can be used as a key to populate world info.
 */
function get_world_name_from_header(header){
    links = header.getElementsByTagName("a");
    return links[links.length - 1].innerHTML;
}

/**
 * Appends the world information to a given auction header
 */
function append_world_header(header, world_data){
    var img_url = "https://static.tibia.com/images/global/content/icon_battleye.gif";
    if (world_data['world_data']['green_battleye']){
        img_url = "https://static.tibia.com/images/global/content/icon_battleyeinitial.gif";
    }
    
    // Add battleye icon
    var img_elem = document.createElement("img");
    img_elem.setAttribute("style", "border: 0px; padding-left: 0.5em;");
    img_elem.setAttribute("src", img_url);
    header.appendChild(img_elem);

    // Remove BR above the new url
    var breaks = header.getElementsByTagName("br");
    breaks[breaks.length - 1].remove();
    
    // Add br at end
    header.appendChild(document.createElement("br"));

    var new_header = document.createElement("div");
    new_header.setAttribute("style", "padding-top: 0.35em; margin-top: 0.5em;;");
    new_header.setAttribute("class", "AuctionBody");
    new_header.innerHTML = "World Sales Rank: #"
       + world_data['sales_rank']
       + " | World Success Rate: "
       + Math.round(100 * world_data['success_pct'])
       + "% | World Type: " + world_data['world_data']['pvp_type']
       + " | " + world_data['world_data']['location'];
    new_header.appendChild(document.createElement("br"));

    header.appendChild(new_header); 
}

/**
 * Given the world_sales.txt data, appends the relevant info
 * to each auction.
 */
function populate_world_data(data){
    var headers = document.getElementsByClassName("AuctionHeader");
    for (i = 0; i < headers.length; i++){
        world_name = get_world_name_from_header(headers[i]);
        world_data = data[world_name];
        append_world_header(headers[i], world_data);
    }
}

/**
 * Reads the world sales file and then calls
 * the callback function with the parsed JSON
 */
function read_world_sales(callback){
    const url = chrome.runtime.getURL('world_sales.txt');
    fetch(url)
    .then((response) => response.json())
    .then((json) => callback(json));
}

/**
 * Adds the customized prediction region at
 * the top of the prediction webpage
 */
function add_search_box(){
    const url = chrome.runtime.getURL('search_box_2.html');
    fetch (url)
    .then((response) => response.text())
    .then(text => {
        var tr = document.createElement("div");
        tr.innerHTML = text;
        tr.setAttribute("id", "prediction-search-box");
        tr.appendChild(document.createElement("br"));
        var container = document.getElementsByClassName("TableContainer")[1];
        // container.appendChild(tr);
        container.parentNode.insertBefore(tr, container);
        var link = document.getElementById('predict_submit');
        link.addEventListener('click', function() {
            predictChar();
        });
        notification_box();
    })
    .catch(function(err){
        console.log("ERROR: " + err);
    });
}

// Used to only send 1 prediction request at a time
var cur_predicting=false;

/**
 * Constructs a URL for the GET request to the backend server
 * for an individual prediction. Used in the customized
 * single prediction search box.
 */
function construct_prediction_url(data){
    return "<REMOVED>" 
    + "?predict_char=true"
    + "&predict_level=" + data.predict_level
    + "&predict_vocation=" + data.predict_vocation
    + "&predict_world=" + data.predict_world
    + "&predict_melee=" + data.predict_melee
    + "&predict_dist=" + data.predict_dist
    + "&predict_mlevel=" + data.predict_mlevel;
}

/**
 * Predicts a single customized character auction. Used for the
 * single prediction search box.
 */
function predictChar(){

    // Predict 1x at a time
    if (cur_predicting){
        return
    }

    vocation_dropdown = document.getElementById("predict_vocation")
    world_dropdown = document.getElementById("predict_world")
    
    data = {
        predict_char: true,
        predict_level: document.getElementById("predict_level").value,
        predict_vocation: vocation_dropdown[vocation_dropdown.selectedIndex].text,
        predict_world: world_dropdown[world_dropdown.selectedIndex].text,
        predict_melee: document.getElementById("predict_melee").value,
        predict_dist: document.getElementById("predict_dist").value,
        predict_mlevel: document.getElementById("predict_mlevel").value
    };

    if (data.predict_mlevel == "" && data.predict_dist == "" && data.predict_melee == ""){
        return;
    }

    if (data.predict_mlevel == ""){
        data.predict_mlevel = 0;
    }
    if (data.predict_dist == ""){
        data.predict_dist = 10;
    }
    if (data.predict_melee == ""){
        data.predict_melee = 10;
    }

    if (data.predict_level == "" || data.predict_vocation == "" || data.predict_world == "" ||
        data.predict_melee == "" || data.predict_dist == "" || data.predict_mlevel == ""){
            return;
    }

    // If we're taking longer than 5 seconds, a new GCP cloud function instance is being created,
    // so it could take up to 1 min to get a response from the server.
    setTimeout(function(){
        if (cur_predicting){
            var last_row = document.getElementById("prediction-search-box").getElementsByClassName("DisplayOptionsContent")[1];

            if (!document.getElementById("prediction-please-wait")){
                var new_elem = document.createElement("b");
                new_elem.setAttribute("class", "ColorRed");
                new_elem.setAttribute("id", "prediction-please-wait");
                new_elem.innerHTML = "This may take up to 1 minute. Please be patient!";
                last_row.parentNode.appendChild(new_elem);
            }
        }
    }, 5000)

    cur_predicting = true;
    var value_elem = document.getElementById("predict_value");
    value_elem.innerHTML = "...";
    
    url = construct_prediction_url(data);
    var btn = document.getElementById('predict_submit');
    btn.setAttribute("disabled", "true");

    try{
        $.ajax({
            type: 'GET',
            url: url,
            success: function(value) {
                output_value = "N/A";
                console.log(value);
                if (value != "N/A" && value != -1){
                    output_value = Math.round(value / 10) * 10;
                }
                cur_predicting = false;
                value_elem.innerHTML = output_value;
                btn.removeAttribute("disabled");

                var last_row = document.getElementById("prediction-please-wait");
                if (last_row != null){
                    last_row.remove();
                }
            }
        })
    } catch (err) {
        value_elem.innerHTML = "ERROR";
    }
}

/**
 * Creates the notification box for a given notification JSON response from the server.
 * Makes sure we haven't cleared the notification first.
 */
function create_notification(json){
    const url = chrome.runtime.getURL('notification_box.html');
    fetch (url)
    .then((response) => response.text())
    .then(response => {

        var id = json.id;
        var text = json.text;

        // We can send empty text if we don't want to send any notification
        if (text == ""){
            return;
        }

        var cookies_id = String("bazaar--notification--id--" + id);
        
        chrome.storage.sync.get([cookies_id], function(item) {
            var value = item[cookies_id];

            if (value == "cleared"){
                return;
            }

            var tr = document.createElement("div");
            tr.innerHTML = response;
            tr.appendChild(document.createElement("br"));
            tr.setAttribute("id", "bazaar-notification-box");
    
            var container = document.getElementsByClassName("TableContainer")[0];
            container.parentNode.insertBefore(tr, container);
    
            var notification_container = document.getElementById("bazaar-notification");
            notification_container.innerHTML = text;
            
            var clear_btn = document.getElementById('bazaar-notification-dismiss');
            clear_btn.addEventListener('click', function() {
                chrome.storage.sync.set({[cookies_id]: "cleared"}, function(){
                    console.log("Setting to cleared.");
                })

                document.getElementById("bazaar-notification-box").remove();
            });

        })

    });
}

/**
 * Queries the backend server for a new notification, and
 * if it exists we create a the notification box.
 */
function notification_box(){
    $.ajax({
        type: 'GET',
        url: "<REMOVED>",
        success: function(output) {
            if (output == ""){
                return;
            }

            create_notification(JSON.parse(output));
        }
    })
}

// If we are on the current character auction webpage, add the customized prediction box.
if ((window.location.href.startsWith("https://www.tibia.com/charactertrade/?subtopic=currentcharactertrades")
    || window.location.href.startsWith("https://www.tibia.com/charactertrade/?subtopic=charactertrades"))
    && document.getElementsByClassName("CharacterView").length == 0){
    add_search_box();
}

// Append predictions to webpage
get_predictions();

// Append world data to webpage
read_world_sales(function(data) {
    populate_world_data(data);
})

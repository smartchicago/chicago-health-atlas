/*!
 * Searchable Map Template with Google Fusion Tables
 * http://derekeder.com/searchable_map_template/
 *
 * Copyright 2012, Derek Eder
 * Licensed under the MIT license.
 * https://github.com/derekeder/FusionTable-Map-Template/wiki/License
 *
 * Date: 8/15/2012
 * 
 */
 
var MapsLib = MapsLib || {};
var MapsLib = {
  
  //Setup section - put your Fusion Table details here
  //Using the v1 Fusion Tables API. See https://developers.google.com/fusiontables/docs/v1/migration_guide for more info
  
  //the encrypted Table ID of your Fusion Table (found under File => About)
  //NOTE: numeric IDs will be depricated soon
  fusionTableId:      "1Fc7U3cdueYMlNy2c4SPbKaoQmju5J6UYhkHQNHc",  
  
  //*New Fusion Tables Requirement* API key. found at https://code.google.com/apis/console/   
  //*Important* this key is for demonstration purposes. please register your own.   
  googleApiKey:       "AIzaSyA3FQFrNr5W2OEVmuENqhb2MBB2JabdaOY",        
  
  //name of the location column in your Fusion Table. 
  //NOTE: if your location column name has spaces in it, surround it with single quotes 
  //example: locationColumn:     "'my location'",
  locationColumn:     "geometry",  

  map_centroid:       new google.maps.LatLng(41.8781136, -87.66677856445312), //center that your map defaults to
  locationScope:      "chicago",      //geographical area appended to all address searches
  recordName:         "result",       //for showing number of results
  recordNamePlural:   "results", 
  
  searchRadius:       1,            //in meters ~ 1/2 mile
  defaultZoom:        11,             //zoom level when map is loaded (bigger is more zoomed in)
  addrMarkerImage: '/images/blue-pushpin.png',
  infoWindow: null,
  currentPinpoint: null,
  
  initialize: function() {
    $( "#resultCount" ).html("");
  
    geocoder = new google.maps.Geocoder();
    var myOptions = {
      zoom: MapsLib.defaultZoom,
      center: MapsLib.map_centroid,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    map = new google.maps.Map($("#mapCanvas")[0],myOptions);
    
    MapsLib.searchrecords = null;
    
    //reset filters
    $("#txtSearchAddress").val(MapsLib.convertToPlainString($.address.parameter('address')));
    $("#resultCount").hide();
     
    //run the default search
    MapsLib.doSearch();
  },
  
  doSearch: function(location) {
    MapsLib.clearSearch();
    var address = $("#txtSearchAddress").val();

    var whereClause = MapsLib.locationColumn + " not equal to ''";
    
    // //-----filter by type-------
    // //remove MapsLib if you don't have any types to filter
    
    // //best way to filter results by a type is to create a 'type' column and assign each row a number (strings work as well, but numbers are faster). then we can use the 'IN' operator and return all that are selected
    // //NOTE: if your column name has spaces in it, surround it with single quotes 
    // //example: var searchType = "'my filter' IN (-1,";
    // var searchType = "type IN (-1,";
    // if ( $("#cbType1").is(':checked')) searchType += "1,";
    // if ( $("#cbType2").is(':checked')) searchType += "2,";
    // if ( $("#cbType3").is(':checked')) searchType += "3,";
    // whereClause += " AND " + searchType.slice(0, searchType.length - 1) + ")";
    
    // //-------end of filter by type code--------
    
    if (address != "") {
      if (address.toLowerCase().indexOf(MapsLib.locationScope) == -1)
        address = address + " " + MapsLib.locationScope;
  
      geocoder.geocode( { 'address': address}, function(results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
          MapsLib.currentPinpoint = results[0].geometry.location;
          
          $.address.parameter('address', encodeURIComponent(address));
          map.setCenter(MapsLib.currentPinpoint);
          map.setZoom(14);
          
          MapsLib.addrMarker = new google.maps.Marker({
            position: MapsLib.currentPinpoint, 
            map: map, 
            icon: MapsLib.addrMarkerImage,
            animation: google.maps.Animation.DROP,
            title:address
          });
          
          whereClause += " AND ST_INTERSECTS(" + MapsLib.locationColumn + ", CIRCLE(LATLNG" + MapsLib.currentPinpoint.toString() + "," + MapsLib.searchRadius + "))";
          
          MapsLib.submitSearch(whereClause, map, MapsLib.currentPinpoint);
        } 
        else {
          alert("We could not find your address: " + status);
        }
      });
    }
    else { //search without geocoding callback
      MapsLib.submitSearch(whereClause, map);
    }
  },
  
  submitSearch: function(whereClause, map, location) {
    var indicator_view = $('#indicator_view').val();

    //get using all filters
    MapsLib.searchrecords = new google.maps.FusionTablesLayer({
      query: {
        from:   MapsLib.fusionTableId,
        select: MapsLib.locationColumn,
        where:  whereClause
      },
      styles: MapsLib.mapStyles(),
      suppressInfoWindows: true
    });

    if (location) {
      MapsLib.getInfoWindowContent(whereClause);
    }

    MapsLib.searchrecords.setMap(map);

    if (MapsLib.infoWindow) MapsLib.infoWindow.close();

    //override default info window
    google.maps.event.addListener(MapsLib.searchrecords, 'click', 
      function(e) { 
        if (MapsLib.infoWindow) MapsLib.infoWindow.close();
        // console.log('showing: ' + indicator_view);
        // console.log(e.row);
        // console.log(e.row['Community Area Name'].value);
        // console.log(e.row[indicator_view].value);
        MapsLib.openFtInfoWindow(e.latLng, e.row['Community Area Name'].value, indicator_view, e.row[indicator_view].value);
      }
    ); 
  },

  openFtInfoWindow: function(position, community_area, indicator_name, indicator_value) {
    // Set up and create the infowindow
    if (!MapsLib.infoWindow) MapsLib.infoWindow = new google.maps.InfoWindow({});
     
    var content = "<div class='googft-info-window' style='font-family: sans-serif'>";
    content += "<span class='lead'>" + community_area + "</span>"
    content += "<p>" + indicator_name + ": " + indicator_value + "</p>";
    content += '</div>';
    
    MapsLib.infoWindow.setOptions({
      content: content,
      pixelOffset: null,
      position: position
    });
    // Infowindow-opening event handler
    MapsLib.infoWindow.open(map);
    //MapsLib.getInfoWindowDescription(zone_class);
  },
  
  getInfoWindowContent: function(whereClause) {
    var indicator_view = $('#indicator_view').val();
    var selectColumns = "'Community Area Name', '" + indicator_view + "'";
    MapsLib.query(selectColumns, whereClause, "MapsLib.setInfoWindowContent");
  },
  
  setInfoWindowContent: function(json) { 
    var data = json["rows"];
    MapsLib.openFtInfoWindow(MapsLib.currentPinpoint, data[0][0], json["columns"][1], data[0][1])
  },

  bucketRanges: function(indicator_view) {

    var ranges = 
    {
      "Birth Rate": {
        "max": 22.4,
        "min": 9.4,
      },
      "General Fertility Rate": {
        "max": 94.9,
        "min": 27.7,
      },
      "Low Birth Weight": {
        "max": 19.7,
        "min": 3.5,
      },
      "Prenatal Care Beginning in First Trimester": {
        "max": 94.5,
        "min": 63.6,
      },
      "Preterm Births": {
        "max": 17.5,
        "min": 5,
      },
      "Teen Birth Rate": {
        "max": 116.9,
        "min": 1.3,
      },
      "Assault (Homicide)": {
        "max": 62.9,
        "min": 0,
      },
      "Breast cancer in females": {
        "max": 56,
        "min": 8.6,
      },
      "Cancer (All Sites)": {
        "max": 283.9,
        "min": 120.9,
      },
      "Colorectal Cancer": {
        "max": 55.4,
        "min": 6.4,
      },
      "Diabetes-related": {
        "max": 122.8,
        "min": 26.8,
      },
      "Firearm-related": {
        "max": 63.6,
        "min": 1.5,
      },
      "Infant Mortality Rate": {
        "max": 27.6,
        "min": 1.5,
      },
      "Lung Cancer": {
        "max": 98.7,
        "min": 23.6,
      },
      "Prostate Cancer in Males": {
        "max": 129.1,
        "min": 2.5,
      },
      "Stroke (Cerebrovascular Disease)": {
        "max": 110.9,
        "min": 23.5,
      },
      "Childhood Blood Lead Level Screening": {
        "max": 609.4,
        "min": 0,
      },
      "Childhood Lead Poisoning": {
        "max": 3,
        "min": 0,
      },
      "Gonorrhea in Females": {
        "max": 2664.6,
        "min": 0,
      },
      "Gonorrhea in Males": {
        "max": 2125.4,
        "min": 0,
      },
      "Tuberculosis": {
        "max": 22.7,
        "min": 0,
      },
      "Below Poverty Level": {
        "max": 61.4,
        "min": 3.1,
      },
      "Crowded Housing": {
        "max": 17.6,
        "min": 0.2,
      },
      "Dependency": {
        "max": 50.2,
        "min": 15.5,
      },
      "No High School Diploma": {
        "max": 58.7,
        "min": 2.9,
      },
      "Per Capita Income": {
        "max": 87163,
        "min": 8535,
      },
      "Unemployment": {
        "max": 40,
        "min": 4.2,
      }
    }

    return [ranges[indicator_view]['min'], ranges[indicator_view]['max']];

  },

  mapStyles: function() {
    var indicator_view = $('#indicator_view').val();

    var ranges = MapsLib.bucketRanges(indicator_view);
    var min = ranges[0];
    var max = ranges[1];
    var num_buckets = 4;
    var range = max - min;
    var interval = range / num_buckets;
    var intervalArray = [ min, (min + interval), (min + interval*2), (min + interval*3) ];

    //console.log(intervalArray);
    return [
      {
        polygonOptions: {
          fillColor: "#cccccc",
          fillOpacity: 0.5
        }
      }, {
        where: "'" + indicator_view + "' >= " + intervalArray[0] + " AND '" + indicator_view + "' < " + intervalArray[1] + "",
        polygonOptions: {
          fillColor: "#6fa8dc"
        }
      }, {
        where: "'" + indicator_view + "' >= " + intervalArray[1] + " AND '" + indicator_view + "' < " + intervalArray[2] + "",
        polygonOptions: {
          fillColor: "#3d85c6"
        }
      }, {
        where: "'" + indicator_view + "' >= " + intervalArray[2] + " AND '" + indicator_view + "' < " + intervalArray[3] + "",
        polygonOptions: {
          fillColor: "#0b5394"
        }
      }, {
        where: "'" + indicator_view + "' >= " + intervalArray[3] + "",
        polygonOptions: {
          fillColor: "#073763"
        }
      }];
  },
  
  clearSearch: function() {
    if (MapsLib.searchrecords != null)
      MapsLib.searchrecords.setMap(null);
    if (MapsLib.addrMarker != null)
      MapsLib.addrMarker.setMap(null);  
  },
  
  findMe: function() {
    // Try W3C Geolocation (Preferred)
    var foundLocation;
    
    if(navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        foundLocation = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
        MapsLib.addrFromLatLng(foundLocation);
      }, null);
    }
    else {
      alert("Sorry, we could not find your location.");
    }
  },
  
  addrFromLatLng: function(latLngPoint) {
    geocoder.geocode({'latLng': latLngPoint}, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        if (results[1]) {
          $('#txtSearchAddress').val(results[1].formatted_address);
          $('.hint').focus();
          MapsLib.doSearch();
        }
      } else {
        alert("Geocoder failed due to: " + status);
      }
    });
  },
  
  query: function(selectColumns, whereClause, callback) {
    var queryStr = [];
    queryStr.push("SELECT " + selectColumns);
    queryStr.push(" FROM " + MapsLib.fusionTableId);
    queryStr.push(" WHERE " + whereClause);
  
    var sql = encodeURIComponent(queryStr.join(" "));
    //console.log("https://www.googleapis.com/fusiontables/v1/query?sql="+sql+"&callback="+callback+"&key="+MapsLib.googleApiKey);
    $.ajax({url: "https://www.googleapis.com/fusiontables/v1/query?sql="+sql+"&callback="+callback+"&key="+MapsLib.googleApiKey, dataType: "jsonp"});
  },

  handleError: function(json) {
    if (json["error"] != undefined)
      console.log("Error in Fusion Table call: " + json["error"]["message"]);
  },
  
  displayCount: function(whereClause) {
    var selectColumns = "Count()";
    MapsLib.query(selectColumns, whereClause,"MapsLib.displaySearchCount");
  },
  
  displaySearchCount: function(json) { 
    MapsLib.handleError(json);
    var numRows = 0;
    if (json["rows"] != null)
      numRows = json["rows"][0];
    
    var name = MapsLib.recordNamePlural;
    if (numRows == 1)
    name = MapsLib.recordName;
    $( "#resultCount" ).fadeOut(function() {
        $( "#resultCount" ).html(MapsLib.addCommas(numRows) + " " + name + " found");
      });
    $( "#resultCount" ).fadeIn();
  },
  
  addCommas: function(nStr) {
    nStr += '';
    x = nStr.split('.');
    x1 = x[0];
    x2 = x.length > 1 ? '.' + x[1] : '';
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
      x1 = x1.replace(rgx, '$1' + ',' + '$2');
    }
    return x1 + x2;
  },
  
  //converts a slug or query string in to readable text
  convertToPlainString: function(text) {
    if (text == undefined) return '';
    return decodeURIComponent(text);
  }
}
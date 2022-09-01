function httpGet(theUrl)
{
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", theUrl, false ); // false for synchronous request
    xmlHttp.send( null );
    return xmlHttp.responseText;
}

async function main_loop() {
  while (true) {
    var value = httpGet("http://192.168.8.116:3001/to_run").toString()
    if (value != last_value && value[value.length-1] == "+") {
      eval(value.substring(0, value.length - 1))
    }
    var last_value = value
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

main_loop()
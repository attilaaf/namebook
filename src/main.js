"use strict";

var NB_LAST_ADDR     = null;
var NB_LAST_TXS      = null;
var NB_REFRESH_TX_N  = true;
var NB_HOT_INPUT     = false;
var NB_HOT_OUTPUT    = false;
var NB_ADDRESS       = null;
var NB_TXS           = null;
var NB_ADDR_CHECKING = false;

function nb_start() {
    if (window.attachEvent) {
        window.attachEvent('onload', nb_main);
    } else {
        if (window.onload) {
            var curronload = window.onload;
            var newonload = function() {
                curronload();
                nb_main();
            };
            window.onload = newonload;
        } else {
            window.onload = nb_main;
        }
    }
}

function nb_main() {
    var greet = document.getElementById("nb-greet");
    greet.classList.add("disappear");

    setTimeout(function() {
        var greet = document.getElementById("nb-greet");
        greet.classList.add("nb-hidden-view");

        var main = document.getElementById("nb-main");
        main.classList.remove("nb-hidden-view");

        // Let's remove the greeting text.
        while (main.hasChildNodes()) main.removeChild(main.lastChild);

        var wrapper_table = document.createElement("div");
        wrapper_table.style.width="100%";
        wrapper_table.style.height="100%";
        wrapper_table.style.display="table";
        var wrapper_cell = document.createElement("div");
        wrapper_cell.style.display="table-cell";
        wrapper_cell.style.verticalAlign="middle";
        var wrapper = document.createElement("div");
        wrapper.style.marginLeft="auto";
        wrapper.style.marginRight="auto";

        // Let's construct the channel index input.
        var table = document.createElement("table");
        var caption = document.createElement("caption");
        var tr1 = document.createElement("tr");
        var tr2 = document.createElement("tr");
        var tr3 = document.createElement("tr");
        var tr4 = document.createElement("tr");
        var td1 = document.createElement("td");
        var td2 = document.createElement("td");
        var td3 = document.createElement("td");
        var td4 = document.createElement("td");
        table.id = "nb-searchtable";

        var input = document.createElement("input");
        input.size = "1";
        input.id = "nb-input";
        input.placeholder = "Enter the name here.";
        input.classList.add("nb-borderbox");
        if (input.addEventListener) {
            input.addEventListener('input', function() {
                nb_input_update();
            }, false);
        }

        var hash = document.createElement("input");
        hash.size = "1";
        hash.id = "nb-hash";
        hash.placeholder = "Hash of name will appear here.";
        hash.classList.add("nb-borderbox");
        hash.readOnly = true;
        hash.style.display = "none";

        var output = document.createElement("input");
        output.size = "1";
        output.id = "nb-output";
        output.placeholder = "Bitcoin address will appear here.";
        output.classList.add("nb-borderbox");
        output.readOnly = true;

        if (output.addEventListener) {
            output.addEventListener('input', function() {
                nb_output_update();
            }, false);
        }

        var txs = document.createElement("span");
        txs.id = "nb-txs-span";
        txs.appendChild(document.createTextNode("Resolving the name..."));

        caption.appendChild(document.createTextNode("Resolve a Name to Bitcoin Address"));
        td1.appendChild(input);
        tr1.appendChild(td1);
        td2.appendChild(hash);
        tr2.appendChild(td2);
        td3.appendChild(output);
        tr3.appendChild(td3);
        td4.appendChild(txs);
        tr4.appendChild(td4);
        table.appendChild(caption);
        table.appendChild(tr1);
        table.appendChild(tr2);
        table.appendChild(tr3);
        table.appendChild(tr4);

        wrapper.appendChild(table);
        wrapper_cell.appendChild(wrapper);
        wrapper_table.appendChild(wrapper_cell);

        main.appendChild(wrapper_table);
        main.classList.add("appear");

        // Let's start the main loop.
        setTimeout(function() {
            nb_input_update();
            nb_main_loop();
        }, 1000);
    }, 500);
}

function nb_main_loop() {
    nb_check_hash();
    if (!NB_HOT_OUTPUT) nb_check_output();

    if (NB_REFRESH_TX_N && !NB_HOT_INPUT) {
        nb_refresh_tx_n();
    }

    NB_HOT_INPUT = false;
    NB_HOT_OUTPUT = false;

    setTimeout(function(){
        nb_main_loop();
    }, 500);
}

function nb_input_update() {
    var input = document.getElementById("nb-input");
    var value = input.value;
    var ripemd160 = CryptoJS.algo.RIPEMD160.create();
    ripemd160.update(value);
    value = ripemd160.finalize();

    var hash = document.getElementById("nb-hash");
    if (hash.value !== value) {
        NB_REFRESH_TX_N = true;
        NB_HOT_INPUT = true;

        var output = document.getElementById("nb-output");
        output.readOnly = true;
        output.placeholder = "Bitcoin address will appear here.";
        output.value = "";
        NB_ADDRESS = null;
    }
    hash.value = value;
}

function nb_output_update() {
    NB_HOT_OUTPUT = true;
}

function nb_refresh_tx_n() {
    if (NB_ADDR_CHECKING) return;
    NB_REFRESH_TX_N = false;

    var hash = document.getElementById("nb-hash");
    var addr = Bitcoin.createAddressFromText(hex2ascii(hash.value));

    if (!Bitcoin.testAddress(addr)) {
        nb_refresh_txs("");
        return;
    }

    if (addr === NB_LAST_ADDR) return;

    NB_ADDR_CHECKING = true;
    xmlhttpGet("https://blockchain.info/multiaddr?active="+addr+"&cors=true&format=json", '',
        function(response) {
            NB_ADDR_CHECKING = false;

            var hash = document.getElementById("nb-hash");
            if (addr !== Bitcoin.createAddressFromText(hex2ascii(hash.value))) return;

                 if (response === false) nb_refresh_txs("");
            else if (response === null ) nb_refresh_txs("");
            else {
                NB_LAST_ADDR = addr;
                var json = JSON.parse(response);
                if ("addresses" in json && json.addresses.length > 0
                && json.addresses[0].n_tx > 0) {
                    NB_ADDR_CHECKING = true;
                    var tx = json.txs[json.txs.length-1].hash;
                    var n_tx = json.addresses[0].n_tx;

                    xmlhttpGet("https://blockchain.info/tx-index/"+tx+"?format=json&cors=true", '',
                        function(json) {
                            NB_ADDR_CHECKING = false;

                            if (json === false || json === null) {
                            }
                            else {
                                var r = JSON.parse(json);
                                if (typeof r === 'object') {
                                    var outs = r.out.length;

                                    for (var j = 0; j < outs; j++) {
                                        if ("addr" in r.out[j]) {
                                            var address = r.out[j].addr;

                                            var output = document.getElementById("nb-output");
                                            output.readOnly = true;
                                            output.placeholder = "Bitcoin address will appear here.";
                                            output.value = address;

                                            nb_refresh_txs(addr, n_tx);
                                            NB_TXS = json.txs;

                                            return;
                                        }
                                    }

                                    nb_refresh_txs(addr, n_tx);
                                    NB_TXS = json.txs;
                                    return;
                                }
                            }

                            nb_refresh_txs("");
                        }
                    );
                }
                else nb_refresh_txs("");
            }
        }
    );
}

var nb_refresh_txs = (function(addr, n_tx) {
    var running = false;

    return function(addr, n_tx) {
        if (running) {
            setTimeout(function() {
                nb_refresh_txs(addr, n_tx);
            }, 1000);
            return;
        }
        running = true;

        var txs = document.getElementById("nb-txs-span");

        if (addr === "") {
            txs.classList.remove("appear");
            txs.classList.add("disappear");

            setTimeout(function() {
                var text = "This name is free for registration.";
                var txs = document.getElementById("nb-txs-span");
                while (txs.hasChildNodes()) txs.removeChild(txs.lastChild);
                txs.appendChild(document.createTextNode(text));
                txs.classList.remove("disappear");
                txs.classList.add("appear");
                NB_LAST_TXS = text;

                var output = document.getElementById("nb-output");
                output.readOnly = false;
                output.placeholder = "Enter the Bitcoin address here.";

                running = false;
            }, 1000);

            return;
        }

        txs.classList.remove("appear");
        txs.classList.add("disappear");

        setTimeout(function() {
            var txs = document.getElementById("nb-txs-span");
            while (txs.hasChildNodes()) txs.removeChild(txs.lastChild);

            var text = "Found "+n_tx+" transaction"+(n_tx == 1 ? "" : "s")+".";
            var href = "https://blockchain.info/address/"+addr;
            if (n_tx === 0) {
                text = "Click here to claim the above name and address.";
                var hash = document.getElementById("nb-hash");
                hash = Bitcoin.createAddressFromText(hex2ascii(hash.value));
                href = "http://cryptograffiti.info#"+hash+"#"+addr+":0.00000546#write:";
            }
            NB_LAST_TXS = text;

            var a_proof   = document.createElement("a");
            a_proof.appendChild(document.createTextNode(text));
            a_proof.title = "Browse this channel's transactions.";
            a_proof.href  = href;
            a_proof.target= "_blank";
            a_proof.classList.add("nb-txs-link");

            if (n_tx !== 0) txs.appendChild(document.createTextNode("("));
            txs.appendChild(a_proof);
            if (n_tx !== 0) txs.appendChild(document.createTextNode(")"));
            txs.classList.remove("disappear");
            txs.classList.add("appear");

            running = false;
        }, 1000);
    };
})();

var nb_check_hash = (function() {
    var running = false;

    return function() {
        if (running) return;
        running = true;

        running = false;
    };
})();

var nb_check_output = (function() {
    var running = false;

    return function() {
        if (running) return;
        running = true;

        var output = document.getElementById("nb-output");
        if (!output.readOnly) {
            if (NB_ADDRESS !== output.value) {
                NB_ADDRESS = output.value;

                if (Bitcoin.testAddress(output.value)) {
                    nb_refresh_txs(output.value, 0);
                }
                else {
                    if ("This name is free for registration." !== NB_LAST_TXS) {
                        nb_refresh_txs("");
                    }
                }
            }
        }

        running = false;
    };
})();


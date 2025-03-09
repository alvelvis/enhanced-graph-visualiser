var root = './lib/'; // filled in by jekyll
var protocol = (document.location.protocol !== 'file:') ? document.location.protocol : 'http:';
head.js(
    // External libraries
    root + 'ext/jquery.min.js',
    root + 'ext/jquery.svg.min.js',
    root + 'ext/jquery.svgdom.min.js',
    root + 'ext/jquery-ui.min.js',
    root + 'ext/waypoints.min.js',
    root + 'ext/jquery.address.min.js',

    // brat helper modules
    root + 'brat/configuration.js',
    root + 'brat/util.js',
    root + 'brat/annotation_log.js',
    root + 'ext/webfont.js',

    // brat modules
    root + 'brat/dispatcher.js',
    root + 'brat/url_monitor.js',
    root + 'brat/visualizer.js',
    // embedding configuration
    root + 'local/config.js',
    // project-specific collection data
    root + 'local/collections.js',

    // NOTE: non-local libraries
    protocol + '//spyysalo.github.io/annodoc/lib/local/annodoc.js',
    protocol + '//spyysalo.github.io/conllu.js/conllu.js',
    //JNW stuff
    root + 'visualise.js'
);
var webFontURLs = [
    root + 'static/fonts/PT_Sans-Caption-Web-Regular.ttf',
    root + 'static/fonts/Liberation_Sans-Regular.ttf'
];
var setupTabs = function() {
    // standard jQuery UI "tabs" element initialization
    $(".jquery-ui-tabs").tabs({
        heightStyle: "auto"
    });
    // use jQuery address to preserve tab state
    // (see https://github.com/UniversalDependencies/docs/issues/65,
    // http://stackoverflow.com/a/3330919)
    if ($(".jquery-ui-tabs").length > 0) {
        $.address.change(function(event) {
            $(".jquery-ui-tabs").tabs("select", window.location.hash)
        });
        $(".jquery-ui-tabs").bind("tabsselect", function(event, ui) {
            window.location.hash = ui.tab.hash;
        });
    }
};

head.ready(function() {
    // set up UI tabs on page
    setupTabs();
    // mark current collection (filled in by Jekyll)
    Collections.listing['_current'] = 'u-overview';

    //check if the URL contains a sentence
    var url = decodeURI(window.location.href);
    var qindex = url.indexOf("?");
    if (qindex != -1){
        var uri = url.substring(qindex + 1, url.length);
        var arguments = uri.split("&");
        var variables = [];
        for (var i = 0; i < arguments.length; i++) {
            variables[i] = arguments[i].split("=")[1].replace(/\+/g, " ");
            // do this as many times as there are variables
            // add vars for all the next variables you want
        };
        // variables is now an array populated with the values of the variables you want, in order
            // variables[0] is the text for the textbox
            // variables[1] could be the format to be forced

        $("#indata").val(variables[0]);

        keyUpFunc(); // activate it in the display
    }

    // perform all embedding and support functions
    Annodoc.activate(Config.bratCollData, Collections.listing);
    $("#cgin").keyup(
        cgParse
    );
    $("#conlluin").keyup(
        function() {
            var content = $("#conlluin").val();
            $("#dest").removeClass("language-sdparse").addClass("language-conllu");
            $("#dest").html(content); // $("#source");
            Annodoc.activate(Config.bratCollData, Collections.listing);
        }
    )
    $('#indata').keyup(keyUpFunc);

    (function($) {
        function pasteIntoInput(el, text) {
            el.focus();
            if (typeof el.selectionStart == "number") {
                var val = el.value;
                var selStart = el.selectionStart;
                el.value = val.slice(0, selStart) + text + val.slice(el.selectionEnd);
                el.selectionEnd = el.selectionStart = selStart + text.length;
            } else if (typeof document.selection != "undefined") {
                var textRange = document.selection.createRange();
                textRange.text = text;
                textRange.collapse(false);
                textRange.select();
            }
        }
    
        function allowTabChar(el) {
            $(el).keydown(function(e) {
                if (e.which == 9) {
                    pasteIntoInput(this, "\t");
                    return false;
                }
            });
    
            // For Opera, which only allows suppression of keypress events, not keydown
            $(el).keypress(function(e) {
                if (e.which == 9) {
                    return false;
                }
            });
        }
    
        $.fn.allowTabChar = function() {
            if (this.jquery) {
                this.each(function() {
                    if (this.nodeType == 1) {
                        var nodeName = this.nodeName.toLowerCase();
                        if (nodeName == "textarea" || (nodeName == "input" && this.type == "text")) {
                            allowTabChar(this);
                        }
                    }
                })
            }
            return this;
        }
    })(jQuery);
    $(function() {
        $("#indata").allowTabChar();
    });


    $("#annoMode").change(function(){
        if ($('#indata').is(':visible')) {
            updateIndataTable();
        } else {
            updateIndata();
        }
        $('.annoField').hide();
        $('#' + $('#annoMode').val()).show();
    })
    $('#highlight').keyup(function(){
        $('#onlyHighlighted').attr('disabled', $(this).val().length <= 0)
        updateIndataTable();
        keyUpFunc();
    })
    $('#basicDep').change(keyUpFunc)
    $('#enhancedDep').change(function(){ 
        $('#onlyMultipleEnhanced').attr('disabled', !$(this).is(':checked'))
        keyUpFunc() 
    })
    $('#onlyHighlighted').change(keyUpFunc)
    $('#onlyMultipleEnhanced').change(keyUpFunc)

    $('#jumpGo').click(function(){
        if ($('#jumpText').val().trim().length) {
            nextSenSent($('#jumpText').val().trim())
        }
    })

    $("#jumpText").keyup(function(event) {
        if (event.keyCode === 13) {
            $("#jumpGo").click();
        }
    });

    var urlParams = new URLSearchParams(window.location.search);
    var text = urlParams.get('text');
    if (text) {
        $('#indata').val(text);
        $('#basicDep').attr('checked', false).change();
        $('#enhancedDep').attr('checked', true).change();
        if (urlParams.get('focus') === 'true') {
            // Detach the embedding so it can appear properly
            var embedding = $('.embedding').detach();
            // Hide all elements except the embedding
            $('body > *').hide();
            // Append the embedding back to the body
            embedding.appendTo('body').show();
        }
        keyUpFunc();
    }
});

var format = "";

//Listener to Load file
document.getElementById('filename').addEventListener('change', loadFromFile, false);

document.addEventListener('keydown', (event) => {
    if(event.ctrlKey && event.key == "Enter") {
        $('#updateVisBtn').click();
    };
});

//Load Corpora from file
var contents = "";
function loadFromFile(e) {
	contents = "";
    var file = e.target.files[0];
    if (!file) {
        return;
    }
    var reader = new FileReader();
    reader.onload = function(e) {
        contents = e.target.result.trim();
        contents.split("\n").some(line => {
            if (line.includes('\t')) {
                if (line.split("\t")[8] === "_") {
                    $('#enhancedDep').attr('checked', false).change();
                    $('#basicDep').attr('checked', true).change();
                } else {
                    $('#basicDep').attr('checked', false).change();
                    $('#enhancedDep').attr('checked', true).change();
                }
                return true; // Stop further iteration
            }
            return false; // Continue iteration
        });
        loadDataInIndex();
    };
    
    reader.readAsText(file);
    $('#exportBtn').prop("disabled", false);
    $('#updateVisBtn').prop("disabled", false);
    $('#jumpGo').prop("disabled", false);
    $('#jumpText').prop("disabled", false);
}

var availablesentences = 0;
var currentsentence = 0;
var results = new Array();
		
function loadDataInIndex() {
	results = [];
    availablesentences = 0;
    currentsentence = 0;
    var splitted = contents.split("\n\n");
    availablesentences = splitted.length;
			
    if (availablesentences == 1 || availablesentences == 0) {
        document.getElementById('nextSenBtn').disabled = true;
    } else {
		document.getElementById('nextSenBtn').disabled = false;
	}
			
    for (var i = 0; i < splitted.length; ++i) {
        var check = splitted[i];
        results.push(check);
    }
    showDataIndiv();
}

function showDataIndiv() {
	document.getElementById('indata').value = (results[currentsentence]);
    updateIndataTable();
	document.getElementById('currentsen').innerHTML = (currentsentence+1);
	document.getElementById('totalsen').innerHTML = availablesentences;
    keyUpFunc();
}

function updateIndataTable() {
    tableHtml = ""
    tokens = $('#indata').val().trim().split("\n")

    for (let i = 0; i < tokens.length; i++) {
        highlight = ""
        if ($('#highlight').val().length && /\t/.test(tokens[i]) && tokens[i].includes($('#highlight').val())) {
            highlight = "style='background-color:lightyellow;'"
        }
        tableHtml += `<tr class='annoRow' ${highlight}>`;
    
        if (!/\t/.test(tokens[i])) {
            tableHtml += `<td class='annoCell' colspan=42 spellcheck=false contenteditable=true>${tokens[i]}</td>`;
        } else {
            const cols = tokens[i].split("\t");
            for (let j = 0; j < cols.length; j++) {
                tableHtml += `<td class='annoCell' spellcheck=false contenteditable=true>${cols[j]}</td>`;
            }
        }
    
        tableHtml += "</tr>";
    }
    $('#indataTable').html(tableHtml);
    $('.annoCell').keyup(function(){
        updateIndata();
    })
    $('.annoCell').keyup(function(){
        $(this).css('background-color', '#90EE90');
    })
}

function updateIndata() {
    text = ""
    tokens = $(".annoRow")

    tokens.each(function() {
        let token = $(this).children(".annoCell");
    
        token.each(function() {
            text += $(this).text();
            text += "\t";
        });
    
        text = text.trim() + "\n";
    });

    text = text.trim();
    
    $('#indata').val(text);
    keyUpFunc();
}

function prevSenSent() {
	results[currentsentence] = document.getElementById("indata").value;
    currentsentence--;
    if (currentsentence < (availablesentences - 1)) {
        document.getElementById("nextSenBtn").disabled = false;
    }
    if (currentsentence == 0) {
        document.getElementById("prevSenBtn").disabled = true;
    }
    showDataIndiv();
}

//When Navigate to next item
function nextSenSent(goTo=false) {
	results[currentsentence] = document.getElementById("indata").value;
    if (!goTo) {
        currentsentence++;
    } else {
        try {
            goTo = parseInt(goTo);
            if (goTo > 0 && goTo <= availablesentences) {
                currentsentence = goTo-1;
            } else {
                window.alert("Invalid sentence number: " + $('#jumpText').val());
            }
        } catch (error) {
            window.alert("Invalid sentence number: " + $('#jumpText').val());
        }
    }
    if (currentsentence == (availablesentences - 1)) {
        document.getElementById("nextSenBtn").disabled = true;
    } else {
        document.getElementById("nextSenBtn").disabled = false;
    }
    if (currentsentence > 0) {
        document.getElementById("prevSenBtn").disabled = false;
    }
    showDataIndiv();
}

//Export Corpora to file
function exportCorpora() {
    var type = ".txt";
    if (format == "CoNLL-U") {
        type = ".conllu";
    }
			
	results[currentsentence] = document.getElementById("indata").value;
	var finalcontent = "";
	for(var x=0; x < results.length; x++){
		finalcontent = finalcontent + results[x];
		if(x != ((results.length)-1)){
			finalcontent = finalcontent + "\n\n";
		}
	}		
    finalcontent = finalcontent.trim() + "\n\n"
    
    var link = document.createElement('a');
    var mimeType = 'text/plain';
    link.setAttribute('download', 'corpus' + type);
    link.setAttribute('href', 'data:' + mimeType + ';charset=utf-8,' + encodeURIComponent(finalcontent));
    link.click();
}
		
//KeyUp function
function keyUpFunc() {
    var content = $("#indata").val();
    var firstWord = content.replace(/\n/g, " ").split(" ")[0];

    // dealing with # comments at the beginning
    if (firstWord[0] === '#'){
        var following = 1;
        while (firstWord[0] === '#' && following < content.length){
            firstWord = content.split("\n")[following];
            following ++;
        }
    }
    if (firstWord.match(/"<.*/)) {
        format = "CG3";
        var cssClass = "language-conllx";
        var printContent = cgParse(content);
    } else if (firstWord.match(/1/)) {
        format = "CoNLL-U";
        var cssClass = "language-conllu";
        var printContent = conlluParse(content);
    } else {
        format = "SD"
        var cssClass = "language-sdparse";
        var printContent = content.replace(/\n/g, " ");
    }
    $("#detected").html("Detected: " + format + " format");
    $("#dest").removeClass("language-sdparse").removeClass("language-conllu").removeClass("language-conllx");
    $("#dest").addClass(cssClass);
    $("#dest").html(printContent); // $("#source");
    Annodoc.activate(Config.bratCollData, Collections.listing);
    $(".show-hide-div").hide();
}

function conlluParse(text) {
    var tokens = text.split("\n").filter(function(x) {
        var splitTokens = x.split("\t");
        return (x.indexOf("\t") === -1) || (splitTokens[0].indexOf(".") === -1) || $('#enhancedDep').is(":checked");
    });
    for (let i = 0; i < tokens.length; i++) {
        let line = tokens[i];

        if (line.includes('\t')) {
            let token = line.split("\t");

            // Highlight do token independe das outras opções
            if ($('#highlight').val().length && line.includes($('#highlight').val())) {
                tokens[0] = '# visual-style ' + token[0] + ' bgColor:lightyellow' + "\n" + tokens[0];
            }
            // Se mostrar só múltiplas enhanced, precisa ser antes de colorir enhanced
            if ($('#enhancedDep').is(':checked') && $('#onlyMultipleEnhanced').is(':checked') && token[8].indexOf('|') == -1) {
                token[8] = "_";
            }
            // Se mostrar só highlighted, precisa ser antes de colorir enhanced
            if ($('#highlight').val().length && $("#onlyHighlighted").is(":checked") && !line.includes($('#highlight').val())) {
                token[6] = "_";
                token[7] = "_";
                token[8] = "_";
            }
            // Só colorir basic se tiver enhanced mas não estiver marcada para visualizar, por isso preciso fazer isso antes de remover as enhanced
            if (token[8] !== "_"){
                if (token[8].split("|").map(x => x.split(":").slice(0, 2).join(":")).indexOf(`${token[6]}:${token[7].split(":")[0]}`) === -1){
                    head = token[6]
                    label = token[7]
                    tokens[0] = `# visual-style ${head} ${token[0]} ${label} color:red\n` + tokens[0];
                }
            }
            // Se não mostrar enhanced, precisa ser antes de colorir enhanced
            if (!$('#enhancedDep').is(":checked")) {
                token[8] = "_";
            }
            // Só colorir enhanced se tiver visualização de enhanced, e precisa ser antes de remover basic deps pra aproveitar lista de novas relações
            if (token[8] !== "_") {
                for (let dep of token[8].split("|")) {
                    if (dep.split(":").splice(0, 2).join(":") !== `${token[6]}:${token[7].split(":")[0]}`) {
                        deps = dep.split(/:(.*)/s);
                        head = deps[0]
                        label = deps[1]
                        tokens[0] = `# visual-style ${head} ${token[0]} ${label} color:red\n` + tokens[0];
                    }
                }
            }
            // Só posso tirar as basic depois de colorir as enhanced
            if (!$('#basicDep').is(":checked")) {
                token[6] = "_";
                token[7] = "_";
            }
            // Apagar basic que são iguais enhanced
            if ($('#enhancedDep').is(":checked") && $('#basicDep').is(':checked')) {
                if (token[8].split("|").indexOf(`${token[6]}:${token[7]}`) !== -1){
                    token[6] = "_";
                    token[7] = "_";
                }
            }
            tokens[i] = token.join("\t");
        }
    }
    return tokens.join("\n");
}
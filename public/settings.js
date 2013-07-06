
var add = document.createElement("button");
add.type = "button";
add.className = "icon-plus";
add.addEventListener("click", function() {
    var http = new XMLHttpRequest();
        
    http.onreadystatechange = function() {
        if (http.readyState == 4 && http.status == 200) {
            document.querySelector("#guestList").innerHTML += http.responseText;
            addRemoveButton(document.querySelectorAll(".guestInput").length-1);
        }
    }

    currentLength = document.querySelectorAll(".guestInput").length;
    http.open("GET","/guestInput?index="+ currentLength, true);
    http.send();
});

var submit = document.querySelector("#submit");
submit.parentNode.insertBefore(add, submit);

var inputs = document.querySelectorAll(".guestInput");
for (var i = 0; i < inputs.length; i++) {
    addRemoveButton(i);
}

function addRemoveButton(i) {
    var removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove icon-trash";
    removeButton.dataset["index"] = i;
    document.querySelectorAll(".guestInput")[i].appendChild(removeButton);

    removeButtons = document.querySelectorAll(".remove");
    for (var j = 0; j < removeButtons.length; j++) {
        removeButtons[j].addEventListener("click", function() {
            document.querySelectorAll(".guestInput")[this.dataset["index"]].parentNode.removeChild(document.querySelectorAll(".guestInput")[this.dataset["index"]]);
        });
    }
}   
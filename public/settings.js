
var add = document.createElement("button");
add.type = "button";
add.className = "icon-plus";
add.addEventListener("click", function() {
    var http = new XMLHttpRequest();
        
    http.onreadystatechange = function() {
        if (http.readyState == 4 && http.status == 200) {
            var newGuestInput = document.createElement("li");
            newGuestInput.className = "guestInput";
            newGuestInput.innerHTML =  http.responseText;
            document.querySelector("#guestList").appendChild(newGuestInput);
            
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

function addRemoveButton(index) {
    var removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove icon-trash";
    document.querySelectorAll(".guestInput")[index].appendChild(removeButton);

    removeButton.addEventListener("click", function() {
        this.parentNode.parentNode.removeChild(this.parentNode);
    });

}   
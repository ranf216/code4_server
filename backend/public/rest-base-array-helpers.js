// Helper functions for array input management in API client

var arrayInputCounters = {};

function addArrayInput(baseInputId, arrayType)
{
	if (!arrayInputCounters[baseInputId])
	{
		arrayInputCounters[baseInputId] = 1;
	}
	else
	{
		arrayInputCounters[baseInputId]++;
	}
	
	var index = arrayInputCounters[baseInputId];
	var containerId = baseInputId + "_container";
	var container = document.getElementById(containerId);
	
	if (!container) return;
	
	// Create new input row
	var newRow = document.createElement("div");
	newRow.className = "array-input-row";
	
	// Create new input
	var newInput = document.createElement("input");
	newInput.type = "text";
	newInput.className = "inputParam";
	newInput.id = baseInputId + "_" + index;
	newInput.setAttribute("data-array-type", arrayType);
	newInput.setAttribute("data-array-index", index);
	
	// Set default value based on type
	if (arrayType === "narray")
	{
		newInput.value = "0";
	}
	else
	{
		newInput.value = "";
	}
	
	// Create remove button
	var removeBtn = document.createElement("button");
	removeBtn.type = "button";
	removeBtn.className = "array-remove-btn";
	removeBtn.textContent = "✕";
	removeBtn.onclick = function() { removeArrayInput(this); };
	
	newRow.appendChild(newInput);
	newRow.appendChild(removeBtn);
	
	// Insert before the add button
	var addBtn = container.querySelector(".array-add-btn");
	container.insertBefore(newRow, addBtn);
	
	// Show remove buttons if we have more than one input
	updateRemoveButtons(baseInputId);
}

function removeArrayInput(removeBtn)
{
	var row = removeBtn.parentElement;
	var container = row.parentElement;
	var baseInputId = container.id.replace("_container", "");
	
	row.remove();
	
	// Hide remove buttons if only one input remains
	updateRemoveButtons(baseInputId);
}

function updateRemoveButtons(baseInputId)
{
	var containerId = baseInputId + "_container";
	var container = document.getElementById(containerId);
	
	if (!container) return;
	
	var removeButtons = container.querySelectorAll(".array-remove-btn");
	removeButtons.forEach(function(btn) {
		btn.style.display = "inline-block";
	});
}

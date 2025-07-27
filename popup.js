document.addEventListener('DOMContentLoaded', function() {
  // UI Elements
  const mainSettingsView = document.getElementById('main-settings');
  const advancedSettingsView = document.getElementById('advanced-settings');
  const advancedSettingsButton = document.getElementById('advanced-settings-button');
  const backButton = document.getElementById('back-button');
  const saveButton = document.getElementById('save-button');
  const advancedSaveButton = document.getElementById('advanced-save-button');
  
  // Toggles
  const extensionToggle = document.getElementById('extension-toggle');
  const conversionDirectionToggle = document.getElementById('conversion-direction-toggle');
  const temperatureToggle = document.getElementById('temperature-toggle');
  const temperatureUnit = document.getElementById('temperature-unit');
  const lengthToggle = document.getElementById('length-toggle');
  const lengthUnit = document.getElementById('length-unit');
  const weightToggle = document.getElementById('weight-toggle');
  const weightUnit = document.getElementById('weight-unit');
  const volumeToggle = document.getElementById('volume-toggle');
  const volumeUnit = document.getElementById('volume-unit');
  
  // Default settings
  const defaultSettings = {
    extensionEnabled: true,
    convertToMetric: true,
    temperatureConversion: true,
    temperatureUnit: 'celsius',
    lengthConversion: true,
    lengthUnit: 'metric',
    weightConversion: true,
    weightUnit: 'metric',
    volumeConversion: true,
    volumeUnit: 'metric'
  };
  
  // View switching
  advancedSettingsButton.addEventListener('click', function() {
    mainSettingsView.style.display = 'none';
    advancedSettingsView.style.display = 'block';
  });
  
  backButton.addEventListener('click', function() {
    mainSettingsView.style.display = 'block';
    advancedSettingsView.style.display = 'none';
  });
  
  // Load settings
  chrome.storage.sync.get(defaultSettings, function(settings) {
    extensionToggle.checked = settings.extensionEnabled;
    conversionDirectionToggle.checked = settings.convertToMetric;
    
    // Set all individual settings based on the global direction
    if (settings.convertToMetric) {
      temperatureUnit.value = 'celsius';
      lengthUnit.value = 'metric';
      weightUnit.value = 'metric';
      volumeUnit.value = 'metric';
    } else {
      temperatureUnit.value = 'fahrenheit';
      lengthUnit.value = 'imperial';
      weightUnit.value = 'imperial';
      volumeUnit.value = 'imperial';
    }
    
    temperatureToggle.checked = settings.temperatureConversion;
    lengthToggle.checked = settings.lengthConversion;
    weightToggle.checked = settings.weightConversion;
    volumeToggle.checked = settings.volumeConversion;

    // Disable controls if extension is off
    updateDisabledStates(settings.extensionEnabled);
  });
  
  // Master toggle handler
  extensionToggle.addEventListener('change', function() {
    const isEnabled = this.checked;
    
    // Enable/disable all conversion types
    temperatureToggle.checked = isEnabled;
    lengthToggle.checked = isEnabled;
    weightToggle.checked = isEnabled;
    volumeToggle.checked = isEnabled;
    
    // Update disabled states
    updateDisabledStates(isEnabled);
  });
  
  function updateDisabledStates(isEnabled) {
    // Disable toggles in advanced view when extension is off
    [temperatureToggle, lengthToggle, weightToggle, volumeToggle].forEach(toggle => {
      toggle.disabled = !isEnabled;
    });
    
    // Disable unit selects when extension is off
    [temperatureUnit, lengthUnit, weightUnit, volumeUnit].forEach(select => {
      select.disabled = !isEnabled;
    });
  }
  
  // Save settings from main view
  saveButton.addEventListener('click', function() {
    const newSettings = {
      extensionEnabled: extensionToggle.checked,
      convertToMetric: conversionDirectionToggle.checked,
      temperatureConversion: extensionToggle.checked && temperatureToggle.checked,
      temperatureUnit: conversionDirectionToggle.checked ? 'celsius' : 'fahrenheit',
      lengthConversion: extensionToggle.checked && lengthToggle.checked,
      lengthUnit: conversionDirectionToggle.checked ? 'metric' : 'imperial',
      weightConversion: extensionToggle.checked && weightToggle.checked,
      weightUnit: conversionDirectionToggle.checked ? 'metric' : 'imperial',
      volumeConversion: extensionToggle.checked && volumeToggle.checked,
      volumeUnit: conversionDirectionToggle.checked ? 'metric' : 'imperial'
    };
    
    saveSettings(newSettings);
  });
  
  // Save settings from advanced view
  advancedSaveButton.addEventListener('click', function() {
    const newSettings = {
      extensionEnabled: extensionToggle.checked,
      convertToMetric: conversionDirectionToggle.checked,
      temperatureConversion: extensionToggle.checked && temperatureToggle.checked,
      temperatureUnit: temperatureUnit.value,
      lengthConversion: extensionToggle.checked && lengthToggle.checked,
      lengthUnit: lengthUnit.value,
      weightConversion: extensionToggle.checked && weightToggle.checked,
      weightUnit: weightUnit.value,
      volumeConversion: extensionToggle.checked && volumeToggle.checked,
      volumeUnit: volumeUnit.value
    };
    
    saveSettings(newSettings);
  });
  
  // Global direction toggle handler
  conversionDirectionToggle.addEventListener('change', function() {
    if (this.checked) {
      temperatureUnit.value = 'celsius';
      lengthUnit.value = 'metric';
      weightUnit.value = 'metric';
      volumeUnit.value = 'metric';
    } else {
      temperatureUnit.value = 'fahrenheit';
      lengthUnit.value = 'imperial';
      weightUnit.value = 'imperial';
      volumeUnit.value = 'imperial';
    }
  });
  
  // Helper function to save settings
  function saveSettings(settings) {
    chrome.storage.sync.set(settings, function() {
      // Update save button text temporarily
      const saveButtons = [saveButton, advancedSaveButton];
      saveButtons.forEach(btn => {
        btn.textContent = 'Saved!';
        setTimeout(function() {
          btn.textContent = 'Save Changes';
        }, 1500);
      });
      
      // Send message to content script
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "refreshConversions",
            settings: settings
          });
        }
      });
    });
  }
});
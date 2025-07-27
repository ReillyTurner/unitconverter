(function() {
  class ConversionManager {
    constructor() {
      this.conversionData = {};
    }

    async loadCSVData() {
      try {
        const response = await fetch(chrome.runtime.getURL('conversions.csv'));
        const csvText = await response.text();
        const lines = csvText.split('\n');
        const headers = lines[0].split(',');
        
        this.conversionData = {};
        
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim() === '') continue;
          
          const values = lines[i].split(',');
          const entry = {};
          
          for (let j = 0; j < headers.length; j++) {
            entry[headers[j].trim()] = values[j] ? values[j].trim() : '';
          }
          
          const key = `${entry.fromUnit.toLowerCase()}_${entry.toUnit.toLowerCase()}`;
          this.conversionData[key] = {
            factor: parseFloat(entry.factor),
            offset: parseFloat(entry.offset),
            tooltip: entry.tooltip
          };
        }
      } catch (error) {
        console.error('Error loading conversion data:', error);
      }
    }

    convertUnit(value, fromUnit, toUnit) {
      const key = `${fromUnit.toLowerCase()}_${toUnit.toLowerCase()}`;
      if (this.conversionData[key]) {
        const convertedValue = (value + this.conversionData[key].offset) * this.conversionData[key].factor;
        return {
          value: Math.round(convertedValue * 100) / 100,
          tooltip: this.conversionData[key].tooltip
        };
      }
      return null;
    }
  }

  class UnitConverter {
    constructor() {
      this.settings = {
        temperatureConversion: true,
        temperatureUnit: 'celsius',
        lengthConversion: true,
        lengthUnit: 'metric',
        weightConversion: true,
        weightUnit: 'metric',
        volumeConversion: true,
        volumeUnit: 'metric'
      };
      this.conversionManager = new ConversionManager();
      this.initialize();
    }

    initialize() {
      chrome.storage.sync.get(this.settings, (result) => {
        this.settings = result;
        this.conversionManager.loadCSVData().then(() => {
          this.convertUnitsOnPage();
        });
      });

      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "refreshConversions") {
          this.settings = request.settings;
          
          const conversions = document.querySelectorAll('.unit-conversion');
          conversions.forEach(conversion => {
            const parent = conversion.parentNode;
            parent.replaceChild(
              document.createTextNode(conversion.getAttribute('data-original')), 
              conversion
            );
          });
          
          this.conversionManager.loadCSVData().then(() => {
            this.convertUnitsOnPage();
          });
        }
      });
    }

    convertUnitsOnPage() {
      const patterns = {
        // Temperature patterns
        fahrenheit: {
          regex: /(-?\d+(?:\.\d+)?)(\s*)(?:degrees?\s*F(?:ahrenheit)?|°\s*F(?:ahrenheit)?|F(?:ahrenheit)?\s*degrees?)/gi,
          priority: 10,
          convert: (value, text) => {
            if (this.settings.temperatureUnit === 'celsius') {
              const converted = this.conversionManager.convertUnit(value, '°F', '°C');
              if (converted) {
                return {
                  value: converted.value,
                  unit: `${converted.value}°C`,
                  tooltip: converted.tooltip
                };
              }
            }
            return null;
          }
        },
        celsius: {
          regex: /(-?\d+(?:\.\d+)?)(\s*)(?:degrees?\s*C(?:elsius)?|°\s*C(?:elsius)?|C(?:elsius)?\s*degrees?)/gi,
          priority: 10,
          convert: (value, text) => {
            if (this.settings.temperatureUnit === 'fahrenheit') {
              const converted = this.conversionManager.convertUnit(value, '°C', '°F');
              if (converted) {
                return {
                  value: converted.value,
                  unit: `${converted.value}°F`,
                  tooltip: converted.tooltip
                };
              }
            }
            return null;
          }
        },
        
        // Length patterns - Imperial to Metric
        inches: {
          regex: /(\d+(?:\.\d+)?)(\s*)(?:inches?|in|")(?=\s|$|[^\w])/gi,
          priority: 8,
          convert: (value, text) => {
            if (this.settings.lengthUnit === 'metric') {
              const converted = this.conversionManager.convertUnit(value, 'in', 'cm');
              if (converted) {
                return {
                  value: converted.value,
                  unit: `${converted.value} cm`,
                  tooltip: converted.tooltip
                };
              }
            }
            return null;
          }
        },
        feet: {
          regex: /(\d+(?:\.\d+)?)(\s*)(?:feet|foot|ft|')(?=\s|$|[^\w])/gi,
          priority: 8,
          convert: (value, text) => {
            if (this.settings.lengthUnit === 'metric') {
              const converted = this.conversionManager.convertUnit(value, 'ft', 'm');
              if (converted) {
                return {
                  value: converted.value,
                  unit: `${converted.value} m`,
                  tooltip: converted.tooltip
                };
              }
            }
            return null;
          }
        },
        yards: {
          regex: /(\d+(?:\.\d+)?)(\s*)(?:yards?|yd)(?=\s|$|[^\w])/gi,
          priority: 8,
          convert: (value, text) => {
            if (this.settings.lengthUnit === 'metric') {
              const converted = this.conversionManager.convertUnit(value, 'yd', 'm');
              if (converted) {
                return {
                  value: converted.value,
                  unit: `${converted.value} m`,
                  tooltip: converted.tooltip
                };
              }
            }
            return null;
          }
        },
        miles: {
          regex: /(\d+(?:\.\d+)?)(\s*)(?:miles?|mi)(?=\s|$|[^\w])/gi,
          priority: 5,
          convert: (value, text) => {
            if (this.settings.lengthUnit === 'metric') {
              const converted = this.conversionManager.convertUnit(value, 'mi', 'km');
              if (converted) {
                return {
                  value: converted.value,
                  unit: `${converted.value} km`,
                  tooltip: converted.tooltip
                };
              }
            }
            return null;
          }
        },
        
        // Length patterns - Metric to Imperial
        millimeters: {
          regex: /(\d+(?:\.\d+)?)(\s*)(?:millimeter|millimetre|millimeters|millimetres|mm)(?=\s|$|[^\w])/gi,
          priority: 15,
          convert: (value, text) => {
            if (this.settings.lengthUnit === 'imperial') {
              const converted = this.conversionManager.convertUnit(value, 'mm', 'in');
              if (converted) {
                return {
                  value: converted.value,
                  unit: `${converted.value} in`,
                  tooltip: converted.tooltip
                };
              }
            }
            return null;
          }
        },
        centimeters: {
          regex: /(\d+(?:\.\d+)?)(\s*)(?:centimeters?|centimetres?|cm)(?=\s|$|[^\w])/gi,
          priority: 12,
          convert: (value, text) => {
            if (this.settings.lengthUnit === 'imperial') {
              const converted = this.conversionManager.convertUnit(value, 'cm', 'in');
              if (converted) {
                return {
                  value: converted.value,
                  unit: `${converted.value} in`,
                  tooltip: converted.tooltip
                };
              }
            }
            return null;
          }
        },
        meters: {
          regex: /(\d+(?:\.\d+)?)(\s*)(?:meters?|metres?|m)(?=\s|$|[^\w²³l])/gi,
          priority: 6,
          convert: (value, text) => {
            if (this.settings.lengthUnit === 'imperial') {
              const converted = this.conversionManager.convertUnit(value, 'm', 'ft');
              if (converted) {
                return {
                  value: converted.value,
                  unit: `${converted.value} ft`,
                  tooltip: converted.tooltip
                };
              }
            }
            return null;
          }
        },
        kilometers: {
          regex: /(\d+(?:\.\d+)?)(\s*)(?:kilometers?|kilometres?|km)(?=\s|$|[^\w])/gi,
          priority: 12,
          convert: (value, text) => {
            if (this.settings.lengthUnit === 'imperial') {
              const converted = this.conversionManager.convertUnit(value, 'km', 'mi');
              if (converted) {
                return {
                  value: converted.value,
                  unit: `${converted.value} mi`,
                  tooltip: converted.tooltip
                };
              }
            }
            return null;
          }
        },
        
        // Weight patterns - Imperial to Metric
        pounds: {
          regex: /(\d+(?:\.\d+)?)(\s*)(?:pounds?|lbs?|lb)(?=\s|$|[^\w])/gi,
          priority: 8,
          convert: (value, text) => {
            if (this.settings.weightUnit === 'metric') {
              const converted = this.conversionManager.convertUnit(value, 'lb', 'kg');
              if (converted) {
                return {
                  value: converted.value,
                  unit: `${converted.value} kg`,
                  tooltip: converted.tooltip
                };
              }
            }
            return null;
          }
        },
        ounces: {
          regex: /(\d+(?:\.\d+)?)(\s*)(?:ounces?|oz)(?!\s*fl)(?=\s|$|[^\w])/gi,
          priority: 8,
          convert: (value, text) => {
            if (this.settings.weightUnit === 'metric') {
              const converted = this.conversionManager.convertUnit(value, 'oz', 'g');
              if (converted) {
                return {
                  value: converted.value,
                  unit: `${converted.value} g`,
                  tooltip: converted.tooltip
                };
              }
            }
            return null;
          }
        },
        
        // Weight patterns - Metric to Imperial
        grams: {
          regex: /(\d+(?:\.\d+)?)(\s*)(?:grams?|g)(?=\s|$|[^\w])/gi,
          priority: 6,
          convert: (value, text) => {
            if (this.settings.weightUnit === 'imperial') {
              const converted = this.conversionManager.convertUnit(value, 'g', 'oz');
              if (converted) {
                return {
                  value: converted.value,
                  unit: `${converted.value} oz`,
                  tooltip: converted.tooltip
                };
              }
            }
            return null;
          }
        },
        kilograms: {
          regex: /(\d+(?:\.\d+)?)(\s*)(?:kilograms?|kg)(?=\s|$|[^\w])/gi,
          priority: 12,
          convert: (value, text) => {
            if (this.settings.weightUnit === 'imperial') {
              const converted = this.conversionManager.convertUnit(value, 'kg', 'lb');
              if (converted) {
                return {
                  value: converted.value,
                  unit: `${converted.value} lb`,
                  tooltip: converted.tooltip
                };
              }
            }
            return null;
          }
        },
        
        // Volume patterns - Imperial to Metric
        fluidOunces: {
          regex: /(\d+(?:\.\d+)?)(\s*)(?:fluid\s+ounces?|fl\s*oz|floz)(?=\s|$|[^\w])/gi,
          priority: 12,
          convert: (value, text) => {
            if (this.settings.volumeUnit === 'metric') {
              const converted = this.conversionManager.convertUnit(value, 'floz', 'ml');
              if (converted) {
                return {
                  value: converted.value,
                  unit: `${converted.value} ml`,
                  tooltip: converted.tooltip
                };
              }
            }
            return null;
          }
        },
        pints: {
          regex: /(\d+(?:\.\d+)?)(\s*)(?:pints?|pt)(?=\s|$|[^\w])/gi,
          priority: 8,
          convert: (value, text) => {
            if (this.settings.volumeUnit === 'metric') {
              const converted = this.conversionManager.convertUnit(value, 'pt', 'ml');
              if (converted) {
                return {
                  value: converted.value,
                  unit: `${converted.value} ml`,
                  tooltip: converted.tooltip
                };
              }
            }
            return null;
          }
        },
        quarts: {
          regex: /(\d+(?:\.\d+)?)(\s*)(?:quarts?|qt)(?=\s|$|[^\w])/gi,
          priority: 8,
          convert: (value, text) => {
            if (this.settings.volumeUnit === 'metric') {
              const converted = this.conversionManager.convertUnit(value, 'qt', 'L');
              if (converted) {
                return {
                  value: converted.value,
                  unit: `${converted.value} L`,
                  tooltip: converted.tooltip
                };
              }
            }
            return null;
          }
        },
        gallons: {
          regex: /(\d+(?:\.\d+)?)(\s*)(?:gallons?|gal)(?=\s|$|[^\w])/gi,
          priority: 8,
          convert: (value, text) => {
            if (this.settings.volumeUnit === 'metric') {
              const converted = this.conversionManager.convertUnit(value, 'gal', 'L');
              if (converted) {
                return {
                  value: converted.value,
                  unit: `${converted.value} L`,
                  tooltip: converted.tooltip
                };
              }
            }
            return null;
          }
        },
        
        // Volume patterns - Metric to Imperial
        milliliters: {
          regex: /(\d+(?:\.\d+)?)(\s*)(?:milliliters?|millilitres?|ml)(?=\s|$|[^\w])/gi,
          priority: 12,
          convert: (value, text) => {
            if (this.settings.volumeUnit === 'imperial') {
              const converted = this.conversionManager.convertUnit(value, 'ml', 'floz');
              if (converted) {
                return {
                  value: converted.value,
                  unit: `${converted.value} fl oz`,
                  tooltip: converted.tooltip
                };
              }
            }
            return null;
          }
        },
        liters: {
          regex: /(\d+(?:\.\d+)?)(\s*)(?:liters?|litres?|L)(?=\s|$|[^\w])/gi,
          priority: 8,
          convert: (value, text) => {
            if (this.settings.volumeUnit === 'imperial') {
              const converted = this.conversionManager.convertUnit(value, 'L', 'gal');
              if (converted) {
                return {
                  value: converted.value,
                  unit: `${converted.value} gal`,
                  tooltip: converted.tooltip
                };
              }
            }
            return null;
          }
        }
      };

      this.walkTextNodes(document.body, (textNode) => {
        const text = textNode.nodeValue;
        
        if (this.isChildOfConversionElement(textNode)) {
          return;
        }
        
        let allMatches = [];
        
        Object.keys(patterns).forEach(patternKey => {
          const pattern = patterns[patternKey];
          
          if (
            (patternKey === 'fahrenheit' || patternKey === 'celsius') && !this.settings.temperatureConversion ||
            (patternKey === 'inches' || patternKey === 'feet' || patternKey === 'yards' || patternKey === 'miles' || 
             patternKey === 'centimeters' || patternKey === 'meters' || patternKey === 'kilometers' || patternKey === 'millimeters') && !this.settings.lengthConversion ||
            (patternKey === 'pounds' || patternKey === 'ounces' || patternKey === 'kilograms' || patternKey === 'grams') && !this.settings.weightConversion ||
            (patternKey === 'gallons' || patternKey === 'quarts' || patternKey === 'pints' || patternKey === 'fluidOunces' || 
             patternKey === 'liters' || patternKey === 'milliliters') && !this.settings.volumeConversion
          ) {
            return;
          }
          
          pattern.regex.lastIndex = 0;
          
          let matches;
          while ((matches = pattern.regex.exec(text)) !== null) {
            const value = parseFloat(matches[1]);
            const originalText = matches[0];
            const convertResult = pattern.convert(value, originalText);
            
            if (!convertResult) continue;
            
            allMatches.push({
              start: matches.index,
              end: pattern.regex.lastIndex,
              priority: pattern.priority,
              original: originalText,
              converted: convertResult.unit,
              tooltip: convertResult.tooltip,
              patternKey: patternKey
            });
          }
        });
        
        allMatches.sort((a, b) => {
          if (b.priority !== a.priority) {
            return b.priority - a.priority;
          }
          return a.start - b.start;
        });
        
        const finalMatches = [];
        for (let i = 0; i < allMatches.length; i++) {
          const current = allMatches[i];
          let hasOverlap = false;
          
          for (let j = 0; j < finalMatches.length; j++) {
            const existing = finalMatches[j];
            if (!(current.end <= existing.start || current.start >= existing.end)) {
              hasOverlap = true;
              break;
            }
          }
          
          if (!hasOverlap) {
            finalMatches.push(current);
          }
        }
        
        finalMatches.sort((a, b) => a.start - b.start);
        
        if (finalMatches.length > 0) {
          const parent = textNode.parentNode;
          const docFrag = document.createDocumentFragment();
          let lastIndex = 0;
          
          finalMatches.forEach(match => {
            if (match.start > lastIndex) {
              docFrag.appendChild(document.createTextNode(text.substring(lastIndex, match.start)));
            }
            
            const conversionSpan = document.createElement('span');
            conversionSpan.className = 'unit-conversion';
            conversionSpan.setAttribute('data-original', match.original);
            conversionSpan.setAttribute('data-converted', match.converted);
            conversionSpan.textContent = match.converted;
            
            const tooltip = document.createElement('span');
            tooltip.className = 'unit-conversion-tooltip';
            tooltip.textContent = match.tooltip;
            conversionSpan.appendChild(tooltip);
            
            conversionSpan.addEventListener('click', (e) => {
              const span = e.currentTarget;
              if (span.classList.contains('original')) {
                span.textContent = span.getAttribute('data-converted');
                span.classList.remove('original');
                
                const tooltip = document.createElement('span');
                tooltip.className = 'unit-conversion-tooltip';
                tooltip.textContent = match.tooltip;
                span.appendChild(tooltip);
              } else {
                span.textContent = span.getAttribute('data-original');
                span.classList.add('original');
                
                const tooltip = document.createElement('span');
                tooltip.className = 'unit-conversion-tooltip';
                tooltip.textContent = `Converted: ${span.getAttribute('data-converted')}`;
                span.appendChild(tooltip);
              }
            });
            
            docFrag.appendChild(conversionSpan);
            lastIndex = match.end;
          });
          
          if (lastIndex < text.length) {
            docFrag.appendChild(document.createTextNode(text.substring(lastIndex)));
          }
          
          parent.replaceChild(docFrag, textNode);
        }
      });
    }

    walkTextNodes(node, callback) {
      if (node.nodeName === 'SCRIPT' || node.nodeName === 'STYLE' || node.nodeName === 'SVG') {
        return;
      }
      
      if (node.nodeType === Node.TEXT_NODE) {
        callback(node);
        return;
      }
      
      const children = node.childNodes;
      for (let i = 0; i < children.length; i++) {
        this.walkTextNodes(children[i], callback);
      }
    }

    isChildOfConversionElement(node) {
      let parent = node.parentNode;
      while (parent) {
        if (parent.classList && parent.classList.contains('unit-conversion')) {
          return true;
        }
        parent = parent.parentNode;
      }
      return false;
    }
  }

  // Initialize the extension
  new UnitConverter();
})();
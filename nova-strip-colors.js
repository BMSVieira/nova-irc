const colors = {
    '00': ['white'],
    '01': ['black'],
    '02': ['navy'],
    '03': ['green'],
    '04': ['red'],
    '05': ['brown', 'maroon'],
    '06': ['purple', 'violet'],
    '07': ['olive'],
    '08': ['yellow'],
    '09': ['lightgreen', 'lime'],
    '10': ['teal', 'bluecyan'],
    '11': ['cyan', 'aqua'],
    '12': ['blue', 'royal'],
    '13': ['pink', 'lightpurple', 'fuchsia'],
    '14': ['gray', 'grey'],
    '15': ['lightgray', 'lightgrey', 'silver']
};

const styles = {
    normal: '\x0F',
    underline: '\x1F',
    bold: '\x02',
    italic: '\x1D',
    inverse: '\x16',
    strikethrough: '\x1E',
    monospace: '\x11',
};

// Styling characters map for quick lookup
const styleChars = new Set(Object.values(styles));

const COLOR_PREFIX = '\x03';
const ZERO_PADDING = styles.bold + styles.bold;
const BAD_STRING_REGEX = /^,\d/;
const COLOR_CODE_REGEX = new RegExp(`^${COLOR_PREFIX}\\d\\d`);

const allColors = {
    fg: [],
    bg: [],
    styles: Object.keys(styles),
    custom: [],
    extras: [],
};

// Function to apply foreground color
const applyForeground = (code, str) => 
    COLOR_PREFIX + code + (BAD_STRING_REGEX.test(str) ? ZERO_PADDING : '') + str + COLOR_PREFIX;

// Function to apply background color
const applyBackground = (code, str) => {
    if (COLOR_CODE_REGEX.test(str)) {
        let strippedStr = str.substring(3);
        return str.substring(0, 3) + ',' + code + (strippedStr.startsWith(ZERO_PADDING) ? strippedStr.slice(ZERO_PADDING.length) : strippedStr);
    }
    return COLOR_PREFIX + '01,' + code + str + COLOR_PREFIX;
};

// Generate color functions dynamically
for (const [code, names] of Object.entries(colors)) {
    for (const name of names) {
        allColors.fg.push(name);
        allColors.bg.push('bg' + name);

        exports[name] = str => applyForeground(code, str);
        exports['bg' + name] = str => applyBackground(code, str);
    }
}

// Generate style functions dynamically
for (const [style, code] of Object.entries(styles)) {
    exports[style] = str => code + str + code;
}

// Custom helpers
const customHelpers = {
    rainbow: (str, colorArr = ['red', 'olive', 'yellow', 'green', 'blue', 'navy', 'violet']) => 
        [...str].map((char, i) => char !== ' ' ? exports[colorArr[i % colorArr.length]](char) : char).join('')
};

for (const [name, func] of Object.entries(customHelpers)) {
    allColors.custom.push(name);
    exports[name] = func;
}

// Utility functions for stripping colors & styles
const extras = {
    stripColors: str => str.replace(/\x03\d{0,2}(,\d{0,2}|\x02\x02)?/g, ''),
    
    stripStyle: (str) => {
        let stack = [];
        let result = "";

        for (let i = 0; i < str.length; i++) {
            let char = str[i];
            if (styleChars.has(char) || char === COLOR_PREFIX) {
                let last = stack.at(-1);
                
                if (last && last[0] === char) {
                    let startIndex = last[1];

                    if (i - startIndex > 1 && char !== COLOR_PREFIX) {
                        result = result.slice(0, startIndex) + result.slice(startIndex + 1, i) + result.slice(i + 1);
                        i -= 2;
                    }
                    stack.pop();
                } else {
                    stack.push([char, result.length]);
                }
            }
            result += char;
        }

        // Remove unmatched style characters
        for (const [char, pos] of [...stack].reverse()) {
            if (char !== COLOR_PREFIX) {
                result = result.slice(0, pos) + result.slice(pos + 1);
            }
        }

        return result;
    },

    stripColorsAndStyle: str => extras.stripColors(extras.stripStyle(str))
};

for (const [name, func] of Object.entries(extras)) {
    allColors.extras.push(name);
    exports[name] = func;
}

// Adds all functions to each other so they can be chained
const addChaining = (fn, excludedTypes = []) => {
    for (const [type, names] of Object.entries(allColors)) {
        if (excludedTypes.includes(type)) continue;
        
        for (const name of names) {
            if (fn[name]) continue;

            Object.defineProperty(fn, name, {
                get: () => {
                    let newFunc = str => exports[name](fn(str));
                    addChaining(newFunc, [...excludedTypes, type]);
                    return newFunc;
                }
            });
        }
    }
};

// Apply chaining to all color functions
for (const names of Object.values(allColors)) {
    for (const name of names) {
        addChaining(exports[name], []);
    }
}

// Adds functions to global String prototype
exports.global = () => {
    let str, irc = {};
    
    Object.defineProperty(String.prototype, 'irc', {
        get() {
            str = this;
            return irc;
        }
    });

    for (const [type, names] of Object.entries(allColors)) {
        for (const name of names) {
            let fn = () => exports[name](str);
            addChaining(fn, [type]);
            irc[name] = fn;
        }
    }
};

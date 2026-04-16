
import { Closure } from './closure.js'


const colors: { [key: string]: ColorCodes } = { all: {} };

class ColorApplicator extends Closure {

  code: string

  attrs: Set<string>


  constructor(code: string, attrs: string[] = []) {

    super((text: string, previous: any = "\x1b[0m"): string => {

      return `${code}${text}${previous}`
    })

    this.code = code;

    this.attrs = new Set<string>();


    for (let attr of attrs) this.attrs.add(attr);

  }
}

const ColorCodes = new Proxy({} as ColorCodes, {

  get(target, color, receiver) {

    if (color !== 'build') {
      return (code, ...tags) => {

        target[color] = new ColorApplicator(code, tags);

        return ColorCodes;
      }
      
    } else {

      return () => {

        for (let color of Object.keys(target)) {
          let applicator = target[color];
          for (let attribute of applicator.attrs) {
            if (colors[attribute] === undefined) {
              colors[attribute] = {} as ColorCodes;
            }

            colors[attribute][color] = applicator;
          }
          colors.all[color] = applicator;
        }

        return colors;
      }
    }
  }

});


type ColorCodes = { [key: string]: ColorApplicator } & any;

type ColorCategories = { [key: string]: ColorCodes }

const Colors: ColorCategories = ColorCodes
  .Reset("\x1b[0m", 'clear')
  .Bright("\x1b[1m", 'clear')
  .Dim("\x1b[2m", 'clear')
  .Underscore("\x1b[4m", 'markup')
  .Blink("\x1b[5m", 'markup')
  .Reverse("\x1b[7m", 'special')
  .Hidden("\x1b[8m", 'special')
  .FgBlack("\x1b[30m", 'fg')
  .FgRed("\x1b[31m", 'fg', 'highlight')
  .FgGreen("\x1b[32m", 'fg', 'highlight')
  .FgYellow("\x1b[33m", 'fg', 'highlight')
  .FgBlue("\x1b[34m", 'fg', 'highlight')
  .FgMagenta("\x1b[35m", 'fg', 'highlight')
  .FgCyan("\x1b[36m", 'fg', 'highlight')
  .FgWhite("\x1b[37m", 'fg')
  .BgBlack("\x1b[40m", 'bg')
  .BgRed("\x1b[41m", 'bg', 'highlight')
  .BgGreen("\x1b[42m", 'bg', 'highlight')
  .BgYellow("\x1b[43m", 'bg', 'highlight')
  .BgBlue("\x1b[44m", 'bg', 'highlight')
  .BgMagenta("\x1b[45m", 'bg', 'highlight')
  .BgCyan("\x1b[46m", 'bg', 'highlight')
  .BgWhite("\x1b[47m", 'bg')
  .build()


export { Colors }

export default Colors.all;



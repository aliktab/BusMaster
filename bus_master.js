// ----------------------------------------------------------------------------------
// PINS

var gpio_pin_def_w = { pin : B1, name : "white " };
var gpio_pin_def_b = { pin : A7, name : "blue  " };
var gpio_pin_def_g = { pin : A6, name : "green " };
var gpio_pin_def_y = { pin : A5, name : "yellow" };



// ----------------------------------------------------------------------------------
// REPEATER

function on_rep_call_back(_obj, _cmd)
{
  _obj[_cmd]();
}

var rep =
{
  obj : null,
  cmd : null,
  iid : null,

  run : function(_t)
  {
    this.stop();
    this.iid = setInterval(on_rep_call_back, _t * 1000, this.obj, this.cmd);
  },

  stop : function()
  {
    if (null !== this.iid)
      clearInterval(this.iid);
    this.iid = null;
  }
};



// ----------------------------------------------------------------------------------
// POWER

var pow =
{
  v0 : function()
  {
    pinMode(B0, "input");
    return digitalRead(B0);
  },

  v3 : function()
  {
    digitalWrite(B0, HIGH);
  },

  v5 : function()
  {
    digitalWrite(B0, LOW);
  }
};



// ----------------------------------------------------------------------------------
// ANALOG

function anl_read(_rep_t, _silent)
{
  rep.obj = this; rep.cmd = "r";
  if (undefined !== _rep_t) rep.run(_rep_t);

  pinMode(this.pin.pin, this.cfg.pin_mode.r);
  this.val.val = analogRead(this.pin.pin);

  if (undefined === _silent || !_silent)
    console.log("  ANL : " + this.pin.name + " -> " + this.val.val);

  return this.val;
}

var anl_def_cfg = {
                    pin_mode : ({ r : "analog" })
                  };

var anl_def_val = { val : null };

var anl =
{
  w : ({
        r : anl_read,
        cfg : anl_def_cfg.clone(),
        val : anl_def_val.clone(),
        pin : gpio_pin_def_w
      }),
  b : ({
        r : anl_read,
        cfg : anl_def_cfg.clone(),
        val : anl_def_val.clone(),
        pin : gpio_pin_def_b
      }),
  g : ({
        r : anl_read,
        cfg : anl_def_cfg.clone(),
        val : anl_def_val.clone(),
        pin : gpio_pin_def_g
      }),
  y : ({
        r : anl_read,
        cfg : anl_def_cfg.clone(),
        val : anl_def_val.clone(),
        pin : gpio_pin_def_y
      }),

  r : function()
  {
    this.w.r();
    this.b.r();
    this.g.r();
    this.y.r();
  }
};



// ----------------------------------------------------------------------------------
// PWM

var pwm_pin_watch_mode = { repeat : true, edge : "both", debounce : 0, irq : true };

var on_pwm_pin_changed = E.asm("int(bool)",
"  ldr   r1, clock",
"  ldr   r2, [r1]",       // current time in r2

"  mov   r1, r0",         // save income in r1
"  nop",
"  adr   r0, value",      // data adress in r0
"  str   r1, [r0]",       // save input in [value]

"  ldr   r3, [r0, #8]",   // previouse time in r3
"  str   r2, [r0, #8]",   // save current time

"  cmp   r2, r3",         // if new time greater then prev time so it's new timer cycle
"  bgt   tmreset",
"  sub   r3, r3, r2",     // time delta in r3
"  b     normal",

"tmreset:",
"  ldr   r0, maxtm",      // max_time in r0
"  sub   r0, r0, r2",     // get the time passed in new cycle
"  add   r3, r3, r0",     // add the time tail from prev cycle

"normal:",
"  lsl   r1, r1, #2",
"  adr   r0, value",      // data adress in r0
"  add   r1, r0, r1",     // ttoh or ttol (addr - 8) in r1, depends on input value
"  str   r3, [r1, #12]",  // save time delta in ttoh or ttol

"  ldr   r1, [r0, #4]",   // counter in r1
"  add   r1, r1, #1",     // increment counter
"  str   r1, [r0, #4]",   // store counter

"  bx    lr",
"  nop",

"value:",                 // +00
"  .word   0x10",
"counter:",               // +04
"  .word   0x0",
"time:",                  // +08
"  .word   0x05",
"ttol:",                  // +12
"  .word   0x02",
"ttoh:",                  // +16
"  .word   0x03",
"clock:",                 // +20
"  .word   0xE000E018",
"maxtm:",                 // +24
"  .word   0x00FFFFFF"
);

function pwm_write(_val, _freq, _silent)
{
  this.val.val  = (undefined !== _val)  ? _val  : this.val.val;
  this.cfg.freq = (undefined !== _freq) ? _freq : this.cfg.freq;
  this.val.freq = this.cfg.freq;

  if (null !== this.val.val )
    this.val.val = Math.clip(this.val.val, 0.0, 1.0);

  pinMode(this.pin.pin, this.cfg.pin_mode.w);
  analogWrite(this.pin.pin, this.val.val, { freq : this.cfg.freq });

  if (undefined === _silent || !_silent)
    console.log("  PWM : " + this.pin.name + " <- " + _val + " (" + this.cfg.freq + ")");
}

function pwm_read(_rep_t, _silent)
{
  rep.obj = this; rep.cmd = "r";
  if (undefined !== _rep_t) rep.run(_rep_t);

  pinMode(this.pin.pin, this.cfg.pin_mode.r);

  var data = on_pwm_pin_changed();
  poke32(data +  4, 0);           // reset counter to 0
  poke32(data + 20, 0xE000E018);  // fix bug with asm data declaration

  var watch = setWatch(on_pwm_pin_changed, this.pin.pin, pwm_pin_watch_mode);

  var time = getTime();
  while (peek32(data + 4) < 3)
    if (getTime() - time > this.cfg.timeout)
      break;

  clearWatch(watch);

  if (peek32(data + 4) >= 3)
  {
    this.val.val  = peek32(data + 12) / (peek32(data + 12) + peek32(data + 16));
    this.val.freq = 84000000.0 / (peek32(data + 12) + peek32(data + 16));
    if (undefined === _silent || !_silent)
      console.log("  PWM : " + this.pin.name + " -> " +
                  Math.round(this.val.val  * 1000.0) / 1000.0 + " (" +
                  Math.round(this.val.freq * 1000.0) / 1000.0 + ")");
  }
  else
  {
    this.val.val = this.val.freq = null;
    if (undefined === _silent || !_silent)
      console.log("  PWM : " + this.pin.name + " -- no signal (timeout)");
  }

  return this.val;
}

var pwm_def_cfg = {
                    pin_mode : ({ r : "input", w : "output" }),
                    freq : 1000, timeout : 0.3
                  };

var pwm_def_val = { val : null, freq : null };

var pwm = {
  w : ({
        w : pwm_write, r : pwm_read,
        cfg : pwm_def_cfg.clone(),
        val : pwm_def_val.clone(),
        pin : gpio_pin_def_w
      }),
  b : ({
        w : pwm_write, r : pwm_read,
        cfg : pwm_def_cfg.clone(),
        val : pwm_def_val.clone(),
        pin : gpio_pin_def_b
      }),
  g : ({
        w : pwm_write, r : pwm_read,
        cfg : pwm_def_cfg.clone(),
        val : pwm_def_val.clone(),
        pin : gpio_pin_def_g
      }),
  y : ({
        w : pwm_write, r : pwm_read,
        cfg : pwm_def_cfg.clone(),
        val : pwm_def_val.clone(),
        pin : gpio_pin_def_y
      }),

  r : function()
  {
    this.w.r();
    this.b.r();
    this.g.r();
    this.y.r();
  }
};



// ----------------------------------------------------------------------------------
// SRV

function srv_wite(_val, _freq, _silent)
{
  this.val.val  = (undefined !== _val)  ? _val  : this.val.val;
  this.cfg.freq = (undefined !== _freq) ? _freq : this.cfg.freq;
  this.val.freq = this.cfg.freq;

  if (null !== this.val.val )
    this.val.val = Math.clip(this.val.val, 0.0, 1.0);

  var pwm_v = (this.cfg.lo_v + _val * (this.cfg.hi_v - this.cfg.lo_v)) * this.cfg.freq * this.cfg.tmet;
  this.pwm.w(pwm_v, this.cfg.freq, true);

  if (undefined === _silent || !_silent)
    console.log("  SRV : " + this.pwm.pin.name + " <- " + _val);
}

function srv_read(_rep_t, _silent)
{
  rep.obj = this; rep.cmd = "r";
  if (undefined !== _rep_t) rep.run(_rep_t);

  this.pwm.r(undefined, true);

  this.val.val  = this.pwm.val.val;
  this.val.freq = this.pwm.val.freq;

  if (null !== this.pwm.val.val && null !== this.pwm.val.freq)
  {
    this.val.val  = (this.pwm.val.val / (this.val.freq * this.cfg.tmet) - this.cfg.lo_v) / (this.cfg.hi_v - this.cfg.lo_v);
    this.val.freq = this.pwm.val.freq;

    if (undefined === _silent || !_silent)
      console.log("  SRV : " + this.pwm.pin.name + " -> " +
                  Math.round(this.val.val  * 1000.0) / 1000.0 + " (" +
                  Math.round(this.val.freq * 1000.0) / 1000.0 + ")");

  console.log(this.pwm.val.val);
  console.log(this.pwm.val.val / (this.val.freq * this.cfg.tmet));
  }
  else
  {
    this.val.val = this.val.freq = null;
    if (undefined === _silent || !_silent)
      console.log("  SRV : " + this.pwm.pin.name + " -- no signal (timeout)");
  }
}

var srv_def_cfg = {
                    lo_v : 544,
                    hi_v : 2400,
                    freq : 50,
                    tmet : 0.000001
                  };

var srv_def_val = { val : null, freq : null };

var srv =
{
  w : ({
        w : srv_wite, r : srv_read,
        cfg : srv_def_cfg.clone(),
        val : srv_def_val.clone(),
        pwm : pwm.w
      }),
  b : ({
        w : srv_wite, r : srv_read,
        cfg : srv_def_cfg.clone(),
        val : srv_def_val.clone(),
        pwm : pwm.b
      }),
  g : ({
        w : srv_wite, r : srv_read,
        cfg : srv_def_cfg.clone(),
        val : srv_def_val.clone(),
        pwm : pwm.g
      }),
  y : ({
        w : srv_wite, r : srv_read,
        cfg : srv_def_cfg.clone(),
        val : srv_def_val.clone(),
        pwm : pwm.y
      }),
};



// ----------------------------------------------------------------------------------
// NEO PIXEL

var RGB  = 0x00123, GRB  = 0x01023;
var RGBW = 0x10123, GRBW = 0x11023;

var npx =
{
// private:

  get_num_of_colors : function()
  {
    return (this.format & 0x10000) ? 4 : 3;
  },

  convert_from_rgbw : function(_color)
  {
    return [
      _color[(this.format & 0xf000) >> 12],
      _color[(this.format & 0x0f00) >>  8],
      _color[(this.format & 0x00f0) >>  4],
      _color[(this.format & 0x000f) >>  0]
    ];
  },

  refresh : function()
  {
    SPI1.setup({ baud : 3200000, mosi : gpio_pin_def_b.pin });
    SPI1.send4bit(this.pixels, 0b0001, 0b0011);
  },

// public:

  pin : gpio_pin_def_b.clone(),

  pixels : null,
  format : null,
  strlen : null,

  i : function(_strlen, _format, _init, _silent)
  {
    this.strlen = (undefined !== _strlen) ? _strlen : 1;
    this.format = (undefined !== _format) ? _format : RGB;

    this.pixels = new Uint8ClampedArray(this.strlen * this.get_num_of_colors());

    _init = this.convert_from_rgbw((undefined !== _init) ? _init : [ 0, 0, 0, 0 ]);

    for (var pi = 0; pi < this.strlen; pi++)
      for (var ci = 0; ci < this.get_num_of_colors(); ci++)
        this.pixels[pi * this.get_num_of_colors() + ci] = _init[ci];

    this.refresh();

    if (undefined === _silent || !_silent)
      console.log("  NPX : " + this.pin.name + " -- initialized to control " + this.strlen +
                  " NeoPixels (0x" + this.format.toString(16) + ", " + this.get_num_of_colors() + ")");
  },

  s : function(_index, _color, _silent)
  {
    _color = this.convert_from_rgbw((undefined !== _color) ? _color : [ 0, 0, 0, 0 ]);

    for (var ci = 0; ci < this.get_num_of_colors(); ci++)
      this.pixels[_index * this.get_num_of_colors() + ci] = _color[ci];

    this.refresh();

    if (undefined === _silent || !_silent)
      console.log("  NPX : " + this.pin.name + " -- pixel(" + _index + ") is set to [" + _color + "]");
  },

  r : function(_level, _silent)
  {
    _level = (undefined !== _level) ? _level : 255;

    for (var pi = 0; pi < this.strlen; pi++)
      for (var ci = 0; ci < this.get_num_of_colors(); ci++)
        this.pixels[pi * this.get_num_of_colors() + ci] = Math.random() * _level;

    this.refresh();

    if (undefined === _silent || !_silent)
      console.log("  NPX : " + this.pin.name +
                  " -- all pixels are filled with random colors with max level " + _level);
  }
};



// ----------------------------------------------------------------------------------
// I2C

var i2c =
{
};



// ----------------------------------------------------------------------------------
// SPI

var spi =
{
};



// ----------------------------------------------------------------------------------
// UART

var uart =
{
};



// ----------------------------------------------------------------------------------
// START INIT

pow.v0();



// ----------------------------------------------------------------------------------
// TEST CASES

/*
console.log(" ");
console.log(" ");
console.log("-------------------------------------------------------------- ANL test cases");

anl.r();

console.log(anl.w.val);
console.log(anl.b.val);
console.log(anl.g.val);
console.log(anl.y.val);

console.log(" ");
console.log(" ");
console.log("-------------------------------------------------------------- PWM test cases");

pwm.w.r();
pwm.g.r();

console.log(" ");
pwm.b.w(0.5, 10000);
pwm.g.r();

console.log(" ");
pwm.b.w(0.3);
pwm.g.r();

console.log(" ");
pwm.b.w(0.5, 100.5);
pwm.g.r();

console.log(" ");

console.log(pwm.b.val);
console.log(pwm.b.cfg);

console.log(pwm.g.val);
console.log(pwm.g.cfg);

console.log(" ");
console.log(" ");
console.log("-------------------------------------------------------------- NPX test cases");

npx.i(7, GRBW, [0, 0, 0, 0]);

npx.r(2);

npx.s(0, [5, 5, 5, 5]);
npx.s(1, [0x5, 0, 0, 0]);
npx.s(2, [0, 0x5, 0, 0]);
npx.s(3, [0, 0, 0x5, 0]);
npx.s(4, [0, 0, 0, 0x5]);

console.log(" ");
console.log(" ");
console.log("-------------------------------------------------------------- SRV test cases");

srv.w.r();
srv.g.r();

console.log(" ");
srv.b.w(0.5, 50);
srv.g.r();

console.log(" ");
srv.b.w(0.3);
srv.g.r();

console.log(" ");
srv.b.w(0.5, 100);
srv.g.r();

console.log(" ");

console.log(srv.b.val);
console.log(srv.b.cfg);

console.log(srv.g.val);
console.log(srv.g.cfg);
*/


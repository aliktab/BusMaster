// PINS

var gpio_pin_def_w = { pin : B1, name : "white " };
var gpio_pin_def_b = { pin : A7, name : "blue  " };
var gpio_pin_def_g = { pin : A6, name : "green " };
var gpio_pin_def_y = { pin : A5, name : "yellow" };



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

  b : function(_t)
  {
    this.e();
    this.iid = setInterval(on_rep_call_back, _t, this.obj, this.cmd);
  },

  e : function()
  {
    if (null !== this.iid)
      clearInterval(this.iid);
    this.iid = null;
  }
};



// ANALOG

var anl_read = function(_rep_t)
{
  rep.obj = this; rep.cmd = "r";
  if (undefined !== _rep_t) rep.b(_rep_t);

  pinMode(this.pin.pin, this.cfg.pin_mode.r);
  this.val.val = analogRead(this.pin.pin);

  console.log("  ANL : " + this.pin.name + " -> " + this.val.val);

  return this.val;
};

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

var pwm_write = function(_val, _freq)
{
  this.val.val  = (undefined !== _val)  ? _val  : this.val.val;
  this.cfg.freq = (undefined !== _freq) ? _freq : this.cfg.freq;
  this.val.freq = this.cfg.freq;

  pinMode(this.pin.pin, this.cfg.pin_mode.w);
  analogWrite(this.pin.pin, this.val.val, { freq : this.cfg.freq });

  console.log("  PWM : " + this.pin.name + " <- " + _val + " (" + this.cfg.freq + ")");
};

var pwm_read = function(_rep_t)
{
  rep.obj = this; rep.cmd = "r";
  if (undefined !== _rep_t) rep.b(_rep_t);

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
    console.log("  PWM : " + this.pin.name + " -> " +
                Math.round(this.val.val  * 1000.0) / 1000.0 + " (" +
                Math.round(this.val.freq * 1000.0) / 1000.0 + ")");
  }
  else
  {
    this.val.val  = null;
    this.val.freq = null;
    console.log("  PWM : " + this.pin.name + " -- no signal (timeout)");
  }

  return this.val;
};

var pwm_def_cfg = {
                    pin_mode : ({ r : "input", w : "output" }),
                    freq : 1000, timeout : 0.5
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



// I2C

var i2c =
{
};








//#TMP
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
pwm.y.w(0.5, 10000);
pwm.g.r();

console.log(" ");
pwm.y.w(0.3);
pwm.g.r();

console.log(" ");
pwm.y.w(0.5, 100.5);
pwm.g.r();

console.log(pwm.y.val);
console.log(pwm.y.cfg);

console.log(pwm.g.val);
console.log(pwm.g.cfg);





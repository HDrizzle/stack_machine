bool state = false;
void setup() {
  // put your setup code here, to run once:
  pinMode(8, OUTPUT);
}

void digitalWriteModified(uint8_t pin, uint8_t val)
{
	//uint8_t timer = digitalPinToTimer(pin);
	uint8_t bit = digitalPinToBitMask(pin);
	uint8_t port = digitalPinToPort(pin);
	volatile uint8_t *out;

	//if (port == NOT_A_PIN) return;

	// If the pin that support PWM output, we need to turn it off
	// before doing a digital write.
	//if (timer != NOT_ON_TIMER) turnOffPWM(timer);

	out = portOutputRegister(port);

	uint8_t oldSREG = SREG;
	cli();

	if (val == LOW) {
		*out &= ~bit;
	} else {
		*out |= bit;
	}

	SREG = oldSREG;
}

void loop() {
  // put your main code here, to run repeatedly:
  //digitalWrite(8, state);
  /*if(state) {
    PORTB = B00000001;//PORTB | 0b00000001;
  }
  else {
    PORTB = B00000000;//PORTB & 0b11111110;
  }
  state = !state;*/
  //PORTB = B00000001;
  //PORTB = B00000000;
  PORTB = (!PORTB) & B00000001;
}

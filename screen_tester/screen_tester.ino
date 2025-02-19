// Uses the arduino in place of the graphics driver to test the screen

#define PIN_DATA 13
#define PIN_CLK 12
#define PIN_LE 11
#define PIN_DRIVER_A0 10
#define PIN_DRIVER_A1 9
#define PIN_DRIVER_A2 8
#define PIN_ROW_A0 7
#define PIN_ROW_A1 6
#define PIN_ROW_A2 5

uint16_t data_buffer[64] = {};
unsigned long bit_period_micros = 1000;
unsigned long last_bit_update_micros = micros();
uint8_t animation_i = 0;
int animation_frames = 20;
int get_mem_address(int driver, int row) {
  return ((driver / 2) * 16) + (driver % 2) + (2*row);
}

// Runs 1 frame
void cycle_first_driver() {
  // Initial pin states
  digitalWrite(PIN_DATA, LOW);
  digitalWrite(PIN_CLK, LOW);
  digitalWrite(PIN_LE, LOW);
  digitalWrite(PIN_DRIVER_A0, LOW);
  digitalWrite(PIN_DRIVER_A1, LOW);
  digitalWrite(PIN_DRIVER_A1, LOW);
  // Loop
  for(uint8_t row = 0; row < 8; row++) {
    int mem_address = get_mem_address(0, row);
    uint16_t data = data_buffer[mem_address];
    for(uint8_t bit_address = 0; bit_address < 16; bit_address++) {
      bool data_value = bitRead(data, 15 - bit_address);
      digitalWrite(PIN_DATA, data_value);
      delay(1);
      digitalWrite(PIN_CLK, HIGH);
      delay(1);
    }
    // Update latch
    digitalWrite(PIN_LE, HIGH);
    delay(1);
    digitalWrite(PIN_LE, LOW);
    // Update row
    digitalWrite(PIN_ROW_A0, bitRead(row, 0));
    digitalWrite(PIN_ROW_A1, bitRead(row, 1));
    digitalWrite(PIN_ROW_A2, bitRead(row, 2));
  }
}

void cycle_simple() {
  digitalWrite(PIN_LE, HIGH);
  digitalWrite(PIN_DRIVER_A0, LOW);
  digitalWrite(PIN_DRIVER_A1, LOW);
  digitalWrite(PIN_DRIVER_A1, LOW);
  while(true) {
    digitalWrite(PIN_DATA, LOW);
    for(uint8_t i = 0; i < 16; i++) {
      digitalWrite(PIN_CLK, HIGH);
      delay(5);
      digitalWrite(PIN_CLK, LOW);
      delay(100);
    }
    digitalWrite(PIN_DATA, HIGH);
    delay(5);
    digitalWrite(PIN_CLK, HIGH);
    delay(5);
    digitalWrite(PIN_CLK, LOW);
    delay(100);
  }
}

void setup() {
  // put your setup code here, to run once:
  pinMode(PIN_DATA, OUTPUT);
  pinMode(PIN_CLK, OUTPUT);
  pinMode(PIN_LE, OUTPUT);
  pinMode(PIN_DRIVER_A0, OUTPUT);
  pinMode(PIN_DRIVER_A1, OUTPUT);
  pinMode(PIN_DRIVER_A2, OUTPUT);
  pinMode(PIN_ROW_A0, OUTPUT);
  pinMode(PIN_ROW_A1, OUTPUT);
  pinMode(PIN_ROW_A2, OUTPUT);
  // Test
  cycle_simple();
}

void loop() {
  // Set data
  if(animation_i < 8) {// Vertical sweep, then horizontal sweep
    for(uint8_t i = 0; i < 8; i++) {
      if(i = animation_i) {
        data_buffer[i*2] = 0xFFFF;
      }
      else {
        data_buffer[i*2] = 0x0000;
      }
    }
  }
  else {
    for(uint8_t i = 0; i < 8; i++) {
      data_buffer[i*2] = 0x0001 << (animation_i - 8);
    }
  }
  // Increment animation index and check if it is max (24)
  animation_i++;
  if(animation_i == 24) {
    animation_i = 0;
  }
  // Run driver update
  for(int i = 0; i < animation_frames; i++) {
    cycle_first_driver();
  }
}

/*  Arduino progrm to upload programs to the computer's program memory
 *  This program is responsible for the timing to send serial data into the chip address and data registers and to clock that into the memory chips
 *  Memory chips documentation: https://ww1.microchip.com/downloads/en/DeviceDoc/20005022C.pdf
 *  NOTE: The data sequence arrays have 16-bit entries even though the chip word size is 8bits, this is because there are two chips in parallel, so the command/data is repeated twice for each chip
 *  
 *  Procedure for uploading over serial:
 *  * Serial becomes available
 *  * RX two bytes (lower byte first) which represent the size of the program
 *  * Chip erase
 *  * TX 0b1000 0000 which means "chip erased"
 *  * Count for program size:
 *    * RX two bytes (lower byte first) which make up instruction, write it to chip
 *    * TX Progress as 1 byte, make sure to round down so 100% is only sent when actually done
 *  * TX 0b1000 0001 which means "done"
 */

#define pin_WE_inverted 2
#define pin_D_0_7 3
#define pin_D_8_15 4
#define pin_D_CLK 5
#define pin_A_0_7 6
#define pin_A_8_15 7
#define pin_A_CLK 8
#define pin_led 13

#define t_we_low 1
#define t_CE 110
#define t_BP 5
#define t_shift_reg_clock 1

#define POWER_16 65536
#define PROG_ARRAY_SIZE 500

static uint8_t CODE_CHIP_ERASED = 0b10000000;
static uint8_t CODE_WRITE_DONE = 0b10000001;

static uint16_t chip_erase_data_sequence[6] = {0xAAAA, 0x5555, 0x8080, 0xAAAA, 0x5555, 0x1010};
static uint16_t chip_erase_address_sequence[6] = {0x5555, 0x2AAA, 0x5555, 0x5555, 0x2AAA, 0x5555};

void recieve_and_upload_program() {
  // Wait for serial available
  while(Serial.available() == 0) {}
  // Receive two bytes for size
  uint16_t lower = (uint16_t)Serial.read();
  while(Serial.available() == 0) {}
  uint16_t upper = (uint16_t)Serial.read();
  uint16_t prog_size = lower | ((upper) << 8);
  Serial.write(prog_size);
  digitalWrite(pin_led, HIGH);
  //Serial.println("Program size: " + prog_size);
  // Erase chip
  chip_erase();
  Serial.write(CODE_CHIP_ERASED);
  //Serial.print("Loading program...");
  for(uint16_t i = 0; i < prog_size; i++) {
    // Receive and byte program
    uint16_t lower = (uint16_t)Serial.read();
    uint16_t upper = (uint16_t)Serial.read();
    uint16_t instruction = lower | ((upper) << 8);
    byte_program(i, instruction);
    // Send progress
    uint8_t progress = (uint8_t)(((uint32_t)(i+1))*100 / ((uint32_t)prog_size));
    Serial.write(progress);
  }
  //Serial.println(" Done");
  Serial.write(CODE_WRITE_DONE);
  digitalWrite(pin_led, LOW);
}

void upload_program(uint16_t program[PROG_ARRAY_SIZE], uint16_t program_size) {
  // Erase chip
  chip_erase();
  // Upload program
  /*Serial.print("upload_program()\nInstruction 0: ");
  Serial.print(program[0], BIN);
  Serial.print(", Instruction 1: ");
  Serial.println(program[1], BIN);
  Serial.println();*/
  //Serial.print("Loading program...");
  for(uint16_t program_counter = 0; program_counter < program_size; program_counter++) {
    /*Serial.print("upload_program() write loop\nAddress: ");
    Serial.print(program_counter, BIN);
    Serial.print(", Instruction: ");
    Serial.println(program[program_counter], BIN);
    Serial.println();*/
    byte_program(program_counter, program[program_counter]);
  }
  //Serial.println(" Done");
}

void chip_erase() {
  //Serial.print("Erasing chips...");
  load_data_and_address(chip_erase_data_sequence, chip_erase_address_sequence, 6);
  // Delay (T-SCE = 100 millis)
  delay(t_CE);
  //Serial.println(" Done");
}

void byte_program(uint16_t address, uint16_t instruction) {
  // Prepare data and address sequences
  uint16_t data_sequence[6] = {0xAAAA, 0x5555, 0xA0A0, 0x0000, 0x0000, 0x0000};
  uint16_t address_sequence[6] = {0x5555, 0x2AAA, 0x5555, 0x0000, 0x0000, 0x0000};
  data_sequence[3] = instruction;
  address_sequence[3] = address;
  //Serial.println("byte_program()");
  /*Serial.print("Instruction: ");
  Serial.print(instruction, BIN);
  Serial.print(", Address: ");
  Serial.println(address, BIN);*/
  //Serial.println();
  // Load data
  load_data_and_address(data_sequence, address_sequence, 4);
  // Delay (T-BP = 20 micros)
  delay(t_BP);
}

void test1() {// move clk-counter-a gpio-write-a
  int prog_size = 100;
  uint16_t instruction = 0b1011101000000000;// cargo run -- -assemble-line move clk-counter-b gpio-write-a
  uint16_t program[PROG_ARRAY_SIZE];
  for(int i = 0; i < prog_size; i++) {
    program[i] = instruction;
  }
  upload_program(program, prog_size);
}

void test2() {// Loop
  int prog_size = 4;
  uint16_t program[PROG_ARRAY_SIZE];
  program[0] = 0b0100000000010001;// write 0x01 goto-a
  program[1] = 0b0101000000000001;// write 0x00 goto-b
  program[2] = 0b1011101000000000;// move clk-counter-b gpio-write-a
  program[3] = 0b0000000000000010;// goto
  upload_program(program, prog_size);
}

void test3_buffer_instruction() {// Loop with initial instructioj to test startup glitch
  int prog_size = 5;
  uint16_t program[PROG_ARRAY_SIZE];
  program[0] = 0b1011101010100001;// write 0xAA gpio-write-a
  program[1] = 0b0100000000100001;// write 0x02 goto-a
  program[2] = 0b0101000000000001;// write 0x00 goto-b
  program[3] = 0b1011101000000000;// move clk-counter-b gpio-write-a
  program[4] = 0b0000000000000010;// goto
  upload_program(program, prog_size);
}

void test_call_return() {// Loop + "function
  int prog_size = 9;
  uint16_t program[PROG_ARRAY_SIZE];
  /*write 0xAA gpio-write-a
    write 0x06 goto-a
    write 0x00 goto-b
    call
    write 0x00 goto-a
    write 0x00 goto-b
    goto
    move clk-counter-b gpio-write-a
    return
   */
  program[0] = 0b1011101010100001;// write 0xAA gpio-write-a
  program[1] = 0b0100000001100001;// write 0x06 goto-a
  program[2] = 0b0101000000000001;// write 0x00 goto-b
  program[3] = 0b0000000000000101;// call
  program[4] = 0b0100000000000001;// write 0x00 goto-a
  program[5] = 0b0101000000000001;// write 0x00 goto-b
  program[6] = 0b0000000000000010;// goto
  program[7] = 0b1011101000000000;// move clk-counter-b gpio-write-a
  program[8] = 0b0000000000000110;// return
  upload_program(program, prog_size);
}

void fibonacci() {
  int prog_size = 10;
  uint16_t program[PROG_ARRAY_SIZE];
  /*write 0xFF gpio-write-a
    write 0x01 alu-a
    write 0x01 alu-b
    write 0x04 goto-a
    write 0x00 goto-b
    move add alu gpio-write-a
    move add alu alu-a
    move add alu gpio-write-a
    move add alu alu-b
    goto
   */
  program[0] = 0b1011111111110001;// write 0xFF gpio-write-a
  program[1] = 0b0010000000010001;// write 0x01 alu-a
  program[2] = 0b0011000000010001;// write 0x01 alu-b
  program[3] = 0b0100000001000001;// write 0x04 goto-a
  program[4] = 0b0101000000000001;// write 0x00 goto-b
  program[5] = 0b1011001000000000;// move add alu gpio-write-a
  program[6] = 0b0010001000000000;// move add alu alu-a
  program[7] = 0b1011001000000000;// move add alu gpio-write-a
  program[8] = 0b0011001000000000;// move add alu alu-b
  program[9] = 0b0000000000000010;// goto
  upload_program(program, prog_size);
}

void test() {
int prog_size = 112;
uint16_t program[PROG_ARRAY_SIZE];
program[0] = 0b1011000000000001;
program[1] = 0b100011000010001;
program[2] = 0b101000000000001;
program[3] = 0b101;
program[4] = 0b100000011000001;
program[5] = 0b101000000000001;
program[6] = 0b101;
program[7] = 0b100010011110001;
program[8] = 0b101000000000001;
program[9] = 0b101;
program[10] = 0b100000010010001;
program[11] = 0b101000000000001;
program[12] = 0b10;
program[13] = 0b1001000000000001;
program[14] = 0b1010000000000001;
program[15] = 0b1000000000000001;
program[16] = 0b1000000000000001;
program[17] = 0b1000000000000001;
program[18] = 0b1000000000000001;
program[19] = 0b1000000000000001;
program[20] = 0b1000000000000001;
program[21] = 0b1000000000000001;
program[22] = 0b1000000000000001;
program[23] = 0b1000110101000001;
program[24] = 0b1000110011010001;
program[25] = 0b1000110111010001;
program[26] = 0b1000000111010001;
program[27] = 0b1000010111000001;
program[28] = 0b1000110101010001;
program[29] = 0b1000010010010001;
program[30] = 0b1000000101010001;
program[31] = 0b1000110101000001;
program[32] = 0b1000110101010001;
program[33] = 0b1000110010000001;
program[34] = 0b1000000101010001;
program[35] = 0b1000010101000001;
program[36] = 0b1000010011010001;
program[37] = 0b1000010111010001;
program[38] = 0b1000000101010001;
program[39] = 0b1000000000000001;
program[40] = 0b1000000000000001;
program[41] = 0b1000000000000001;
program[42] = 0b1000000000000001;
program[43] = 0b1000110101000001;
program[44] = 0b1000110111010001;
program[45] = 0b1000000000000001;
program[46] = 0b1000000000000001;
program[47] = 0b1000010111000001;
program[48] = 0b1000010111010001;
program[49] = 0b1000000000010001;
program[50] = 0b1000000000000001;
program[51] = 0b1000110111000001;
program[52] = 0b1000010011010001;
program[53] = 0b1000000000010001;
program[54] = 0b1000000000000001;
program[55] = 0b1000010111000001;
program[56] = 0b1000110101010001;
program[57] = 0b1000000000000001;
program[58] = 0b1000000000000001;
program[59] = 0b1000000000000001;
program[60] = 0b1000000000000001;
program[61] = 0b1000000000000001;
program[62] = 0b1000000000000001;
program[63] = 0b1000000000000001;
program[64] = 0b1000000000000001;
program[65] = 0b1000000000000001;
program[66] = 0b1000000000000001;
program[67] = 0b1000000000000001;
program[68] = 0b1000000000000001;
program[69] = 0b1000000000000001;
program[70] = 0b1000000000000001;
program[71] = 0b1000000000000001;
program[72] = 0b1000000000000001;
program[73] = 0b1000000000000001;
program[74] = 0b1000000000000001;
program[75] = 0b1000000000000001;
program[76] = 0b1000000000000001;
program[77] = 0b1000000000000001;
program[78] = 0b1000000000000001;
program[79] = 0b110;
program[80] = 0b1001000000000001;
program[81] = 0b1010000000000001;
program[82] = 0b1000000000001;
program[83] = 0b1101111111110001;
program[84] = 0b1011000100000000;
program[85] = 0b1111010100000000;
program[86] = 0b10000100000000;
program[87] = 0b11000000010001;
program[88] = 0b1100001000000000;
program[89] = 0b10000100000000;
program[90] = 0b11010000000001;
program[91] = 0b10001001110000;
program[92] = 0b110001000100000;
program[93] = 0b100010100110001;
program[94] = 0b101000000000001;
program[95] = 0b11;
program[96] = 0b0;
program[97] = 0b110;
program[98] = 0b10000000000001;
program[99] = 0b1011001010000000;
program[100] = 0b1111000000000001;
program[101] = 0b11000000010001;
program[102] = 0b10001000000000;
program[103] = 0b11100000000001;
program[104] = 0b110001001110000;
program[105] = 0b100011011100001;
program[106] = 0b101000000000001;
program[107] = 0b11;
program[108] = 0b100011000100001;
program[109] = 0b101000000000001;
program[110] = 0b10;
program[111] = 0b110;
  upload_program(program, prog_size);
}

void test_slow_single_instruction() {// move clk-counter-a gpio-write-a
  int prog_size = 2;
  uint16_t program[PROG_ARRAY_SIZE];
  program[0] = 0b1010101010101010;
  program[1] = 0b1100110011001100;
  /*Serial.print("Instruction 0: ");
  Serial.print(program[0], BIN);
  Serial.print(", Instruction 1: ");
  Serial.println(program[1], BIN);
  Serial.println();*/
  upload_program(program, prog_size);
}

void load_data_and_address(uint16_t data_sequence[6], uint16_t address_sequence[6], uint8_t sequence_length) {
  for(uint8_t seq_i = 0; seq_i < sequence_length; seq_i++) {
    // Load into shift registers
    uint16_t curr_data = data_sequence[seq_i];
    uint16_t curr_address = address_sequence[seq_i];
    /*Serial.print("load_data_and_address()\nData: ");
    Serial.print(curr_data, BIN);
    Serial.print(", Address: ");
    Serial.println(curr_address, BIN);
    Serial.println();*/
    for(uint8_t bit_i = 7; bit_i != 255; bit_i--) {// Bits have to be shifted MSB first because that is the last stage of the shift registers
      digitalWrite(pin_D_0_7, bitRead(curr_data, bit_i));
      digitalWrite(pin_D_8_15, bitRead(curr_data, bit_i + 8));
      digitalWrite(pin_A_0_7, bitRead(curr_address, bit_i));
      digitalWrite(pin_A_8_15, bitRead(curr_address, bit_i + 8));
      delay(t_shift_reg_clock);
      digitalWrite(pin_D_CLK, HIGH);
      digitalWrite(pin_A_CLK, HIGH);
      delay(t_shift_reg_clock);
      digitalWrite(pin_D_CLK, LOW);
      digitalWrite(pin_A_CLK, LOW);
      delay(t_shift_reg_clock);
    }
    // WE
    digitalWrite(pin_WE_inverted, LOW);
    delay(t_we_low);
    digitalWrite(pin_WE_inverted, HIGH);
    delay(t_we_low);
  }
}

void setup() {
  // Pin setup
  pinMode(pin_WE_inverted, OUTPUT);
  pinMode(pin_D_0_7, OUTPUT);
  pinMode(pin_D_8_15, OUTPUT);
  pinMode(pin_D_CLK, OUTPUT);
  pinMode(pin_A_0_7, OUTPUT);
  pinMode(pin_A_8_15, OUTPUT);
  pinMode(pin_A_CLK, OUTPUT);
  // Serial
  Serial.begin(9600);
  // Initial state
  digitalWrite(pin_WE_inverted, HIGH);
  digitalWrite(pin_D_CLK, LOW);
  digitalWrite(pin_A_CLK, LOW);
  digitalWrite(pin_led, LOW);
  /*while(Serial.available() == 0) {
    Serial.read();
  }*/
  // Test
  test();
  //fibonacci();
  //recieve_and_upload_program();
}

void loop() {
  
}

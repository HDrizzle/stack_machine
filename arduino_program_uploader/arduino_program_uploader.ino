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

void upload_program(uint16_t program[PROG_ARRAY_SIZE], uint16_t program_size, uint16_t start_address, bool chip_erase_) {
  // Erase chip
  if(chip_erase_) {
    chip_erase();
  }
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
    byte_program(program_counter + start_address, program[program_counter]);
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
  upload_program(program, prog_size, 0, true);
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

void test() {
int prog_size = 169;
uint16_t program[PROG_ARRAY_SIZE];
program[0] = 0b1011000000000001;
program[1] = 0b1110000000000001;
program[2] = 0b100100110100001;
program[3] = 0b101000000000001;
program[4] = 0b101;
program[5] = 0b1000000000001;
program[6] = 0b1000000000001;
program[7] = 0b100011010010001;
program[8] = 0b101000000000001;
program[9] = 0b101;
program[10] = 0b10000000000000;
program[11] = 0b110001000100000;
program[12] = 0b100000001100001;
program[13] = 0b101000000000001;
program[14] = 0b11;
program[15] = 0b1101111111100001;
program[16] = 0b1000100000000;
program[17] = 0b1000100000000;
program[18] = 0b100011110110001;
program[19] = 0b101000000000001;
program[20] = 0b101;
program[21] = 0b100001000000001;
program[22] = 0b101000000000001;
program[23] = 0b101;
program[24] = 0b1101111111100001;
program[25] = 0b1000100000000;
program[26] = 0b1000100000000;
program[27] = 0b100100000010001;
program[28] = 0b101000000000001;
program[29] = 0b101;
program[30] = 0b100000001100001;
program[31] = 0b101000000000001;
program[32] = 0b10;
program[33] = 0b1100000000000;
program[34] = 0b10100000000000;
program[35] = 0b11000001110001;
program[36] = 0b10001001100000;
program[37] = 0b11000000000000;
program[38] = 0b110001001010000;
program[39] = 0b100010000110001;
program[40] = 0b101000000000001;
program[41] = 0b11;
program[42] = 0b110001010000000;
program[43] = 0b1101111111100001;
program[44] = 0b100001110100001;
program[45] = 0b101000000000001;
program[46] = 0b11;
program[47] = 0b10000100000000;
program[48] = 0b11000000010001;
program[49] = 0b10001000000000;
program[50] = 0b11001000000001;
program[51] = 0b110001001110000;
program[52] = 0b100001101110001;
program[53] = 0b101000000000001;
program[54] = 0b11;
program[55] = 0b1100001010000000;
program[56] = 0b100010000110001;
program[57] = 0b101000000000001;
program[58] = 0b10;
program[59] = 0b10000100000000;
program[60] = 0b11111111110001;
program[61] = 0b10001000000000;
program[62] = 0b11111111110001;
program[63] = 0b110001001110000;
program[64] = 0b100010000110001;
program[65] = 0b101000000000001;
program[66] = 0b11;
program[67] = 0b1100001010000000;
program[68] = 0b10100000000000;
program[69] = 0b11000001100001;
program[70] = 0b1001001100000;
program[71] = 0b10100000000000;
program[72] = 0b11000001010001;
program[73] = 0b10001001100000;
program[74] = 0b11000000000000;
program[75] = 0b110001001010000;
program[76] = 0b100011010000001;
program[77] = 0b101000000000001;
program[78] = 0b11;
program[79] = 0b110001010000000;
program[80] = 0b1101111111110001;
program[81] = 0b100010111110001;
program[82] = 0b101000000000001;
program[83] = 0b11;
program[84] = 0b10000100000000;
program[85] = 0b11000000010001;
program[86] = 0b10001000000000;
program[87] = 0b11001000000001;
program[88] = 0b110001001110000;
program[89] = 0b100010111000001;
program[90] = 0b101000000000001;
program[91] = 0b11;
program[92] = 0b1100001010000000;
program[93] = 0b100011010000001;
program[94] = 0b101000000000001;
program[95] = 0b10;
program[96] = 0b10000100000000;
program[97] = 0b11111111110001;
program[98] = 0b10001000000000;
program[99] = 0b11111111110001;
program[100] = 0b110001001110000;
program[101] = 0b100011010000001;
program[102] = 0b101000000000001;
program[103] = 0b11;
program[104] = 0b1100001010000000;
program[105] = 0b110;
program[106] = 0b1100000000000;
program[107] = 0b10100000000000;
program[108] = 0b11000001110001;
program[109] = 0b1001001100000;
program[110] = 0b10100000000000;
program[111] = 0b11000001100001;
program[112] = 0b1001001100000;
program[113] = 0b10100000000000;
program[114] = 0b11000001010001;
program[115] = 0b1001001100000;
program[116] = 0b10000000000000;
program[117] = 0b11000000000000;
program[118] = 0b10001000110000;
program[119] = 0b11000000000000;
program[120] = 0b10001000110000;
program[121] = 0b11000000000000;
program[122] = 0b1001000110000;
program[123] = 0b110;
program[124] = 0b100100011010001;
program[125] = 0b101000000000001;
program[126] = 0b101;
program[127] = 0b1011000000000000;
program[128] = 0b1111000000000001;
program[129] = 0b110;
program[130] = 0b1101111111100001;
program[131] = 0b1000100000000;
program[132] = 0b1000100000000;
program[133] = 0b100100011010001;
program[134] = 0b101000000000001;
program[135] = 0b101;
program[136] = 0b1011000000000000;
program[137] = 0b0;
program[138] = 0b11000000000000;
program[139] = 0b10000000010001;
program[140] = 0b1111001001100000;
program[141] = 0b110;
program[142] = 0b10000000000000;
program[143] = 0b11000000100001;
program[144] = 0b1001001100000;
program[145] = 0b1101111111100001;
program[146] = 0b10000100000000;
program[147] = 0b11000001010001;
program[148] = 0b10001001100000;
program[149] = 0b11000000110001;
program[150] = 0b10001001000000;
program[151] = 0b11000000000000;
program[152] = 0b0;
program[153] = 0b1001000000000;
program[154] = 0b110;
program[155] = 0b10000000000001;
program[156] = 0b1011001010000000;
program[157] = 0b1111000000000001;
program[158] = 0b11000000010001;
program[159] = 0b10001000000000;
program[160] = 0b11100000000001;
program[161] = 0b110001001110000;
program[162] = 0b100101001110001;
program[163] = 0b101000000000001;
program[164] = 0b11;
program[165] = 0b100100110110001;
program[166] = 0b101000000000001;
program[167] = 0b10;
program[168] = 0b110;
  upload_program(program, prog_size, 0, true);
  //upload_program_old(program, prog_size);
}

void tetris_0() {
int prog_size = 500;
uint16_t program[PROG_ARRAY_SIZE];
program[0] = 0b1011000000000001;
program[1] = 0b100010100110001;
program[2] = 0b101000000000001;
program[3] = 0b10;
program[4] = 0b100110100110001;
program[5] = 0b101000001000001;
program[6] = 0b101;
program[7] = 0b100100101100001;
program[8] = 0b101000000010001;
program[9] = 0b101;
program[10] = 0b100001000010001;
program[11] = 0b101000001010001;
program[12] = 0b101;
program[13] = 0b100010101010001;
program[14] = 0b101000000010001;
program[15] = 0b101;
program[16] = 0b100000100100001;
program[17] = 0b101000000010001;
program[18] = 0b101;
program[19] = 0b100000001100001;
program[20] = 0b101000000010001;
program[21] = 0b101;
program[22] = 0b100110101100001;
program[23] = 0b101000000010001;
program[24] = 0b101;
program[25] = 0b1010000000000001;
program[26] = 0b1001000000100001;
program[27] = 0b1000000000000000;
program[28] = 0b111000000000000;
program[29] = 0b100001000010001;
program[30] = 0b101000001010001;
program[31] = 0b101;
program[32] = 0b100010010000001;
program[33] = 0b101000000110001;
program[34] = 0b101;
program[35] = 0b100010101010001;
program[36] = 0b101000000010001;
program[37] = 0b101;
program[38] = 0b100110101000001;
program[39] = 0b101000000110001;
program[40] = 0b101;
program[41] = 0b100011111110001;
program[42] = 0b101000000110001;
program[43] = 0b101;
program[44] = 0b1000000000001;
program[45] = 0b100001100110001;
program[46] = 0b101000000010001;
program[47] = 0b101;
program[48] = 0b10000000000000;
program[49] = 0b110001000100000;
program[50] = 0b100000100100001;
program[51] = 0b101000000000001;
program[52] = 0b11;
program[53] = 0b100010000010001;
program[54] = 0b101000000100001;
program[55] = 0b101;
program[56] = 0b100101001110001;
program[57] = 0b101000000100001;
program[58] = 0b101;
program[59] = 0b0;
program[60] = 0b100000110000001;
program[61] = 0b101000000110001;
program[62] = 0b101;
program[63] = 0b1010000000000001;
program[64] = 0b1001000001000001;
program[65] = 0b111000000000000;
program[66] = 0b100001000010001;
program[67] = 0b101000000010001;
program[68] = 0b101;
program[69] = 0b100100101110001;
program[70] = 0b101000001000001;
program[71] = 0b101;
program[72] = 0b1000000000001;
program[73] = 0b1000011110001;
program[74] = 0b1000100000001;
program[75] = 0b100000011110001;
program[76] = 0b101000000010001;
program[77] = 0b101;
program[78] = 0b100111001110001;
program[79] = 0b101000001000001;
program[80] = 0b101;
program[81] = 0b100000100100001;
program[82] = 0b101000000000001;
program[83] = 0b10;
program[84] = 0b100110100110001;
program[85] = 0b101000001000001;
program[86] = 0b101;
program[87] = 0b100100101100001;
program[88] = 0b101000000010001;
program[89] = 0b101;
program[90] = 0b100000100100001;
program[91] = 0b101000000010001;
program[92] = 0b101;
program[93] = 0b100100010000001;
program[94] = 0b101000000010001;
program[95] = 0b101;
program[96] = 0b100001000010001;
program[97] = 0b101000001010001;
program[98] = 0b101;
program[99] = 0b100010101010001;
program[100] = 0b101000000010001;
program[101] = 0b101;
program[102] = 0b1000000000001;
program[103] = 0b100001100110001;
program[104] = 0b101000000010001;
program[105] = 0b101;
program[106] = 0b10000000000000;
program[107] = 0b110001000100000;
program[108] = 0b100011001010001;
program[109] = 0b101000000000001;
program[110] = 0b11;
program[111] = 0b100000111010001;
program[112] = 0b101000000010001;
program[113] = 0b101;
program[114] = 0b100100010000001;
program[115] = 0b101000000010001;
program[116] = 0b101;
program[117] = 0b100001000010001;
program[118] = 0b101000001010001;
program[119] = 0b101;
program[120] = 0b100001000010001;
program[121] = 0b101000000010001;
program[122] = 0b101;
program[123] = 0b100100101110001;
program[124] = 0b101000001000001;
program[125] = 0b101;
program[126] = 0b100000110000001;
program[127] = 0b101000000110001;
program[128] = 0b101;
program[129] = 0b100001000010001;
program[130] = 0b101000000010001;
program[131] = 0b101;
program[132] = 0b100100101110001;
program[133] = 0b101000001000001;
program[134] = 0b101;
program[135] = 0b1000000000001;
program[136] = 0b1000011110001;
program[137] = 0b1000100000001;
program[138] = 0b100000011110001;
program[139] = 0b101000000010001;
program[140] = 0b101;
program[141] = 0b100111001110001;
program[142] = 0b101000001000001;
program[143] = 0b101;
program[144] = 0b1000000000001;
program[145] = 0b100110101000001;
program[146] = 0b101000000110001;
program[147] = 0b101;
program[148] = 0b1000001110001;
program[149] = 0b100001100110001;
program[150] = 0b101000000010001;
program[151] = 0b101;
program[152] = 0b0;
program[153] = 0b100011111110001;
program[154] = 0b101000000110001;
program[155] = 0b101;
program[156] = 0b10000000000000;
program[157] = 0b11000000010001;
program[158] = 0b1001000000000;
program[159] = 0b10001000000000;
program[160] = 0b11000010000001;
program[161] = 0b10001001110000;
program[162] = 0b110001000100000;
program[163] = 0b100110110000001;
program[164] = 0b101000000000001;
program[165] = 0b11;
program[166] = 0b0;
program[167] = 0b1000000000001;
program[168] = 0b100011000000001;
program[169] = 0b101000000110001;
program[170] = 0b101;
program[171] = 0b110000000000000;
program[172] = 0b100101100010001;
program[173] = 0b101000000000001;
program[174] = 0b11;
program[175] = 0b100110110000001;
program[176] = 0b101000000000001;
program[177] = 0b10;
program[178] = 0b100010000010001;
program[179] = 0b101000000100001;
program[180] = 0b101;
program[181] = 0b100101001110001;
program[182] = 0b101000000100001;
program[183] = 0b101;
program[184] = 0b100000101110001;
program[185] = 0b101000000010001;
program[186] = 0b101;
program[187] = 0b100001000010001;
program[188] = 0b101000001010001;
program[189] = 0b101;
program[190] = 0b100000110000001;
program[191] = 0b101000000110001;
program[192] = 0b101;
program[193] = 0b110000000000000;
program[194] = 0b100111100010001;
program[195] = 0b101000000000001;
program[196] = 0b11;
program[197] = 0b1000001110001;
program[198] = 0b100001100110001;
program[199] = 0b101000000010001;
program[200] = 0b101;
program[201] = 0b0;
program[202] = 0b100001000010001;
program[203] = 0b101000000010001;
program[204] = 0b101;
program[205] = 0b100100101110001;
program[206] = 0b101000001000001;
program[207] = 0b101;
program[208] = 0b1000000000001;
program[209] = 0b1000011110001;
program[210] = 0b1000100000001;
program[211] = 0b100000011110001;
program[212] = 0b101000000010001;
program[213] = 0b101;
program[214] = 0b100111001110001;
program[215] = 0b101000001000001;
program[216] = 0b101;
program[217] = 0b1000001110001;
program[218] = 0b100001100110001;
program[219] = 0b101000000010001;
program[220] = 0b101;
program[221] = 0b0;
program[222] = 0b100001000000001;
program[223] = 0b101000001100001;
program[224] = 0b101;
program[225] = 0b100010010000001;
program[226] = 0b101000000110001;
program[227] = 0b101;
program[228] = 0b1000001110001;
program[229] = 0b100001100110001;
program[230] = 0b101000000010001;
program[231] = 0b101;
program[232] = 0b0;
program[233] = 0b100011001110001;
program[234] = 0b101000000010001;
program[235] = 0b101;
program[236] = 0b100010010100001;
program[237] = 0b101000001100001;
program[238] = 0b101;
program[239] = 0b100100100000001;
program[240] = 0b101000000000001;
program[241] = 0b10;
program[242] = 0b0;
program[243] = 0b100000010010001;
program[244] = 0b101000000010001;
program[245] = 0b101;
program[246] = 0b1001000000010001;
program[247] = 0b111000000000001;
program[248] = 0b100010010000001;
program[249] = 0b101000000110001;
program[250] = 0b101;
program[251] = 0b100010101010001;
program[252] = 0b101000000010001;
program[253] = 0b101;
program[254] = 0b100011001010001;
program[255] = 0b101000000000001;
program[256] = 0b10;
program[257] = 0b1001000000000001;
program[258] = 0b1010000000010001;
program[259] = 0b110;
program[260] = 0b1001000000000001;
program[261] = 0b1010000000100001;
program[262] = 0b110;
program[263] = 0b1001000000000001;
program[264] = 0b1010000000110001;
program[265] = 0b110;
program[266] = 0b1001000000000001;
program[267] = 0b1010000001000001;
program[268] = 0b110;
program[269] = 0b1001000000000001;
program[270] = 0b1010000001010001;
program[271] = 0b110;
program[272] = 0b1001000000000001;
program[273] = 0b1010000001100001;
program[274] = 0b110;
program[275] = 0b100000011000001;
program[276] = 0b101000000010001;
program[277] = 0b101;
program[278] = 0b111000000000001;
program[279] = 0b110;
program[280] = 0b1001000000000001;
program[281] = 0b1010000001110001;
program[282] = 0b10000000000000;
program[283] = 0b11010000000000;
program[284] = 0b111001000000000;
program[285] = 0b110;
program[286] = 0b1001000000000001;
program[287] = 0b1010000001110001;
program[288] = 0b111000000000001;
program[289] = 0b110;
program[290] = 0b100000011000001;
program[291] = 0b101000000010001;
program[292] = 0b101;
program[293] = 0b1010000000000;
program[294] = 0b10010000000000;
program[295] = 0b11000000010001;
program[296] = 0b10001000000000;
program[297] = 0b11000010000001;
program[298] = 0b110001001110000;
program[299] = 0b100001100000001;
program[300] = 0b101000000010001;
program[301] = 0b11;
program[302] = 0b100001100010001;
program[303] = 0b101000000010001;
program[304] = 0b10;
program[305] = 0b10000000000001;
program[306] = 0b111001010000000;
program[307] = 0b110;
program[308] = 0b100000010010001;
program[309] = 0b101000000010001;
program[310] = 0b101;
program[311] = 0b1100000000000;
program[312] = 0b1101111111110001;
program[313] = 0b10000100000000;
program[314] = 0b11010000000000;
program[315] = 0b10001001010000;
program[316] = 0b10001000100000;
program[317] = 0b111000100000000;
program[318] = 0b11000000000000;
program[319] = 0b10001001000000;
program[320] = 0b1001000000010001;
program[321] = 0b11010000000000;
program[322] = 0b1001000110000;
program[323] = 0b1101111111100001;
program[324] = 0b10000100000000;
program[325] = 0b10001000100000;
program[326] = 0b11000010010001;
program[327] = 0b11001000000000;
program[328] = 0b1101111111110001;
program[329] = 0b10000100000000;
program[330] = 0b1001001100000;
program[331] = 0b1101111111010001;
program[332] = 0b11000100000000;
program[333] = 0b10111111100001;
program[334] = 0b11001001100000;
program[335] = 0b1101111111100001;
program[336] = 0b10000100000000;
program[337] = 0b111001001000000;
program[338] = 0b1101111111110001;
program[339] = 0b1100000000000000;
program[340] = 0b1100000000000000;
program[341] = 0b110;
program[342] = 0b1001000000000001;
program[343] = 0b1010000000000001;
program[344] = 0b1000000000001;
program[345] = 0b1101111111110001;
program[346] = 0b1011000100000000;
program[347] = 0b1111010100000000;
program[348] = 0b10000100000000;
program[349] = 0b11000000010001;
program[350] = 0b1100001000000000;
program[351] = 0b10000100000000;
program[352] = 0b11100000000001;
program[353] = 0b10001001110000;
program[354] = 0b110001000100000;
program[355] = 0b100010110010001;
program[356] = 0b101000000010001;
program[357] = 0b11;
program[358] = 0b0;
program[359] = 0b110;
program[360] = 0b1010000000000001;
program[361] = 0b1001010000001;
program[362] = 0b1001001010000001;
program[363] = 0b1101111111110001;
program[364] = 0b1011000100000000;
program[365] = 0b1111010100000000;
program[366] = 0b10000100000000;
program[367] = 0b11000000010001;
program[368] = 0b1100001000000000;
program[369] = 0b1011000100000000;
program[370] = 0b1111010100000000;
program[371] = 0b10000100000000;
program[372] = 0b11000000010001;
program[373] = 0b1100001000000000;
program[374] = 0b1011000100000000;
program[375] = 0b1111010100000000;
program[376] = 0b10000100000000;
program[377] = 0b11000000010001;
program[378] = 0b1100001000000000;
program[379] = 0b1011000100000000;
program[380] = 0b1111010100000000;
program[381] = 0b10000100000000;
program[382] = 0b11000000010001;
program[383] = 0b1100001000000000;
program[384] = 0b10000100000000;
program[385] = 0b11100000000001;
program[386] = 0b10001001110000;
program[387] = 0b110001000100000;
program[388] = 0b100011010110001;
program[389] = 0b101000000010001;
program[390] = 0b11;
program[391] = 0b0;
program[392] = 0b110;
program[393] = 0b100000000000001;
program[394] = 0b101000000010001;
program[395] = 0b101;
program[396] = 0b1000000000000001;
program[397] = 0b10011000000000;
program[398] = 0b11110010000001;
program[399] = 0b110001001110000;
program[400] = 0b100100101010001;
program[401] = 0b101000000010001;
program[402] = 0b11;
program[403] = 0b100100010110001;
program[404] = 0b101000000010001;
program[405] = 0b10;
program[406] = 0b110;
program[407] = 0b1010000000000001;
program[408] = 0b1001011111000001;
program[409] = 0b1000111111110001;
program[410] = 0b1000000011110001;
program[411] = 0b1001001010000001;
program[412] = 0b1000111111110001;
program[413] = 0b1000000011110001;
program[414] = 0b1001011000001;
program[415] = 0b1101111111110001;
program[416] = 0b1001000100000000;
program[417] = 0b1000000000010001;
program[418] = 0b111000010000001;
program[419] = 0b10000000000000;
program[420] = 0b11000001000001;
program[421] = 0b1001000000000;
program[422] = 0b10000100000000;
program[423] = 0b11011111000001;
program[424] = 0b10001001110000;
program[425] = 0b110001000100000;
program[426] = 0b100100111110001;
program[427] = 0b101000000010001;
program[428] = 0b11;
program[429] = 0b110;
program[430] = 0b100000000000001;
program[431] = 0b101000000010001;
program[432] = 0b101;
program[433] = 0b1001001010100001;
program[434] = 0b111000000000001;
program[435] = 0b1001001011100001;
program[436] = 0b111000000000001;
program[437] = 0b1001001100100001;
program[438] = 0b111000000000001;
program[439] = 0b1001001101100001;
program[440] = 0b111000000000001;
program[441] = 0b100000000110001;
program[442] = 0b101000000010001;
program[443] = 0b101;
program[444] = 0b10000000000000;
program[445] = 0b11000000010001;
program[446] = 0b1001001001100000;
program[447] = 0b10010100000000;
program[448] = 0b11000011110001;
program[449] = 0b1001001000000;
program[450] = 0b11111100000001;
program[451] = 0b10001001000000;
program[452] = 0b11000001000001;
program[453] = 0b1001001100000;
program[454] = 0b10010100000000;
program[455] = 0b11000011110001;
program[456] = 0b1001001000000;
program[457] = 0b11111100000001;
program[458] = 0b10001001000000;
program[459] = 0b11000001000001;
program[460] = 0b1001001100000;
program[461] = 0b1010000000000001;
program[462] = 0b1001001101100001;
program[463] = 0b111000000000000;
program[464] = 0b1001001100100001;
program[465] = 0b111000000000000;
program[466] = 0b1001001011100001;
program[467] = 0b111000000000000;
program[468] = 0b1001001010100001;
program[469] = 0b111000000000000;
program[470] = 0b110;
program[471] = 0b1000000000001;
program[472] = 0b1000000000001;
program[473] = 0b1001000100000001;
program[474] = 0b1010100000000;
program[475] = 0b1010000000000;
program[476] = 0b1000000000001;
program[477] = 0b1101111111110001;
program[478] = 0b10000100000000;
program[479] = 0b11000001100001;
program[480] = 0b10001001100000;
program[481] = 0b11001111110001;
program[482] = 0b1001001000000;
program[483] = 0b1101111111100001;
program[484] = 0b10000100000000;
program[485] = 0b11000000110001;
program[486] = 0b1001001000000;
program[487] = 0b1101111110110001;
program[488] = 0b10000100000000;
program[489] = 0b1101111111100001;
program[490] = 0b11000100000000;
program[491] = 0b1100001000000000;
program[492] = 0b1101111111000001;
program[493] = 0b10000100000000;
program[494] = 0b1101111111110001;
program[495] = 0b11000100000000;
program[496] = 0b1100001000000000;
program[497] = 0b1101111111010001;
program[498] = 0b1001000100000000;
program[499] = 0b10010000000000;
  upload_program(program, prog_size, 0, true);
}

/*void tetris_1() {

  upload_program(program, prog_size, 1000, false);
}*/

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
  //tetris_0();
  //recieve_and_upload_program();
}

void loop() {
  
}

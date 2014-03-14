/*
  MyChromeBlink
  Turns on an LED on for length you pass in seconds, 
  then off for one second, repeatedly.
 
  Copyright 2013 Renaun Erickson @renaun http://renaun.com
  Use under a MIT license
 */
 
// Pin 13 has an LED connected on most Arduino boards.
// give it a name:
int led = 13;
int lightOnLength = 1;
int blinkCount = 0;
int sensor=A2;
int dir=A1;
int stepPin=A0;

int delayTime=30;
int stepId = 0;

// the setup routine runs once when you press reset:
void setup() {
  Serial.begin(9600);  
  // initialize the digital pin as an output.
  pinMode(led, OUTPUT);
  pinMode(dir, OUTPUT);
  pinMode(stepPin, OUTPUT);
  pinMode(sensor, INPUT);
}

// the loop routine runs over and over again forever:
void loop() {
  //int rand=random(1023);
  char readChar;
  while (Serial.available() > 0) {
      digitalWrite(13, HIGH); 
      readChar=Serial.read();
      if (readChar=='r'){
        digitalWrite(dir,LOW);
        digitalWrite(stepPin,HIGH);
        delayMicroseconds(delayTime);
        digitalWrite(stepPin,LOW);
        delayMicroseconds(delayTime);
      } else if (readChar=='l'){
        digitalWrite(dir,HIGH);
        digitalWrite(stepPin,HIGH);
        delayMicroseconds(delayTime);
        digitalWrite(stepPin,LOW);
        delayMicroseconds(delayTime);
        
      } else if (readChar=='v'){
      } 
      int value=analogRead(sensor);
      byte byteRepresentation[2];
      byteRepresentation[0]=lowByte(value);
      byteRepresentation[1]=highByte(value);
      Serial.write(byteRepresentation,2);
  }
  //int value=analogRead(0);


  /*digitalWrite(13, HIGH);   // turn the LED on (HIGH is the voltage level)
  delay(500);               // wait for a 1/2 second
  digitalWrite(13, LOW);   // turn the LED off (LOW is the voltage level)
  delay(500);               // wait for a 1/2 second*/

}

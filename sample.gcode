; Sample 3-axis G-Code file for testing
; Multi Z-height toolpath demonstration
G21 ; Set units to millimeters
G90 ; Absolute positioning
G28 ; Home all axes

; Initialize spindle
M3 S1000 ; Start spindle at 1000 RPM

; First layer at Z=0.2mm
G0 Z0.2 F800
G0 X0 Y0
G1 X10 Y0 F200
G1 X10 Y10
G1 X0 Y10
G1 X0 Y0

; Move to second layer at Z=0.4mm
G0 Z0.4
G0 X5 Y5
G1 X15 Y5 F200
G1 X15 Y15
G1 X5 Y15
G1 X5 Y5

; Third layer at Z=0.6mm
G0 Z0.6
G0 X2 Y2
G1 X8 Y2 F200
G1 X8 Y8
G1 X2 Y8
G1 X2 Y2

; Circular movements at different Z heights
G0 Z0.8
G0 X20 Y20
G2 X25 Y25 I2.5 J2.5 F150 ; Clockwise arc
G3 X20 Y20 I-2.5 J-2.5 ; Counter-clockwise arc

; Final positioning
G0 Z5 ; Raise to safe height
G0 X0 Y0 ; Return to origin
M5 ; Stop spindle
M30 ; End program
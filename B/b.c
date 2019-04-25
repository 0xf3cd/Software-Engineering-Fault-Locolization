#include <stdio.h>
#include <stdlib.h>

int calculate(int a, int b) {
    if(a % 2 == 0) {
        if(b % 2 != 0) {
            return a * b;
        }
    }

    return a + b;
}

int main() {
    int a, b;
    scanf("%d%d", &a, &b);
    
    printf("The result is: %d\n", calculate(a, b));

    return 0;
}
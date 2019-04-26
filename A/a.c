#include <stdio.h>
#include <stdlib.h>

int findMax(int a, int b, int c) {
    int max = a;

    if(b > max) {
        max = b;
    }

    if(c > a) { // bug
        max = c;
    }

    return max;
}

int getDiff(int a, int b, int c) {
    int diff1 = abs(a - b);
    int diff2 = abs(b - c);
    int diff3 = abs(a - c);

    return findMax(diff1, diff2, diff3);
}

int main() {
    int a, b, c;
    scanf("%d%d%d", &a, &b, &c);
    
    printf("The max diff is: %d\n", getDiff(a, b, c));

    return 0;
}
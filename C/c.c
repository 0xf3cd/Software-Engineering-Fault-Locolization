#include <stdio.h>
#include <stdlib.h>

int f1(int n) {
    if(n == 1) {
        return 1;
    }
    return n + f1(n-1);
}

int f2(int n) {
    if(n == 1) {
        return 1;
    }
    return n * f2(n-1);
}

int main() {
    int a;
    int res;
    scanf("%d", &a);
    
    res = f1(a);
    if(a % 3 == 0) {
        res = f2(a+1); //bug
    }
    
    printf("The result is: %d\n", res);

    return 0;
}
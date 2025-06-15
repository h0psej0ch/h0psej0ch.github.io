import math

high = 0.047692
lowlist = [
    0.032701,
    0.032155,
    0.031258,
    0.030018,
    0.028451,
    0.026573,
    0.024404,
    0.021969,
    0.019294,
    0.016409,
    0.013344,
    0.010135,
    0.006815,
    0.003421
]

for num in lowlist:
    print(f"Low: {num}")
    print(f"Dif: {high - num}")
    for i in range(1,10):
        sin = math.sin(math.radians(i*10))
        dif = sin * (high - num)
        print(f"{high - dif} with sin: {sin}")
    print("\n")
        
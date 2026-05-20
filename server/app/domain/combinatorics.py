def combination(n: int, r: int) -> int:
    if r < 0 or n < 0 or r > n:
        return 0
    selected = min(r, n - r)
    result = 1
    for i in range(1, selected + 1):
        result = result * (n - selected + i) // i
    return result


def calculate_bets(
    primary_count: int,
    secondary_count: int,
    primary_pick: int,
    secondary_pick: int,
) -> int:
    return combination(primary_count, primary_pick) * combination(
        secondary_count,
        secondary_pick,
    )


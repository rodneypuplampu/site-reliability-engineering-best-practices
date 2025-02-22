# Apache Beam Transformations Guide

This guide provides an overview of common Apache Beam transformations and their SQL equivalents. Each transformation is explained with practical examples to help you understand how they work in both Beam and SQL contexts.

## Core Concepts Table

| Beam Transformation | Description | SQL Equivalent | Example |
|-------------------|-------------|----------------|----------|
| ParDo | Element-wise transformation that processes each element independently. Can output zero, one, or multiple elements for each input element. | Map operations, typically using functions or LATERAL EXPLODE | [See ParDo Example](#pardo-example) |
| Join | Combines two PCollections based on matching keys. Similar to CoGroupByKey but specifically for pairs of collections. | JOIN operations (INNER, LEFT, RIGHT, FULL OUTER) | [See Join Example](#join-example) |
| Flatten | Merges multiple PCollections of the same type into a single PCollection. | UNION ALL | [See Flatten Example](#flatten-example) |
| PCollection | The fundamental data structure in Beam representing an immutable, unordered, distributed collection of elements. | Database Table or View | [See PCollection Example](#pcollection-example) |
| GroupByKey | Groups elements with the same key into a single element with that key and an iterable of values. | GROUP BY | [See GroupByKey Example](#groupbykey-example) |

## Detailed Examples

### <a name="pardo-example"></a>ParDo Example

```python
# Beam ParDo Example
class ComputeWordLength(beam.DoFn):
    def process(self, element):
        return [(element, len(element))]

words = p | beam.Create(['apple', 'banana', 'cherry'])
word_lengths = words | beam.ParDo(ComputeWordLength())
```

```sql
-- SQL Equivalent
WITH words AS (
  SELECT word 
  FROM (VALUES ('apple'), ('banana'), ('cherry')) AS t(word)
)
SELECT 
  word,
  LENGTH(word) as word_length
FROM words;
```

### <a name="join-example"></a>Join Example

```python
# Beam Join Example
users = p | 'CreateUsers' >> beam.Create([
    ('1', {'name': 'John'}),
    ('2', {'name': 'Jane'})
])

orders = p | 'CreateOrders' >> beam.Create([
    ('1', {'amount': 100}),
    ('1', {'amount': 200})
])

joined = (({'users': users, 'orders': orders})
          | beam.CoGroupByKey()
          | beam.ParDo(ProcessJoinedResults()))
```

```sql
-- SQL Equivalent
SELECT 
  u.user_id,
  u.name,
  o.amount
FROM users u
INNER JOIN orders o ON u.user_id = o.user_id;
```

### <a name="flatten-example"></a>Flatten Example

```python
# Beam Flatten Example
pc1 = p | 'Create1' >> beam.Create([1, 2, 3])
pc2 = p | 'Create2' >> beam.Create([4, 5, 6])
pc3 = p | 'Create3' >> beam.Create([7, 8, 9])

merged = (
    (pc1, pc2, pc3)
    | beam.Flatten()
)
```

```sql
-- SQL Equivalent
SELECT number FROM dataset1
UNION ALL
SELECT number FROM dataset2
UNION ALL
SELECT number FROM dataset3;
```

### <a name="pcollection-example"></a>PCollection Example

```python
# Beam PCollection Example
# Creating a PCollection from in-memory data
numbers = p | beam.Create([1, 2, 3, 4, 5])

# Creating a PCollection from a file
lines = p | beam.io.ReadFromText('input.txt')

# Transforming a PCollection
processed = numbers | beam.Map(lambda x: x * 2)
```

```sql
-- SQL Equivalent
-- Creating a table
CREATE TABLE numbers (
  value INTEGER
);

-- Populating the table
INSERT INTO numbers VALUES (1), (2), (3), (4), (5);

-- Transforming the data
SELECT value * 2 as doubled_value
FROM numbers;
```

### <a name="groupbykey-example"></a>GroupByKey Example

```python
# Beam GroupByKey Example
words = p | beam.Create([
    ('cat', 1), ('dog', 1), ('cat', 1),
    ('mouse', 1), ('dog', 1)
])

grouped_words = words | beam.GroupByKey()
# Result: [('cat', [1, 1]), ('dog', [1, 1]), ('mouse', [1])]
```

```sql
-- SQL Equivalent
WITH word_counts AS (
  SELECT word, occurrence
  FROM (VALUES 
    ('cat', 1), ('dog', 1), ('cat', 1),
    ('mouse', 1), ('dog', 1)
  ) AS t(word, occurrence)
)
SELECT 
  word,
  COUNT(*) as count,
  ARRAY_AGG(occurrence) as occurrences
FROM word_counts
GROUP BY word;
```

## Best Practices

1. Use ParDo when you need complex element-wise transformations or need to emit multiple elements
2. Prefer Join operations when working with related datasets that share a common key
3. Use Flatten when you need to merge multiple PCollections of the same type
4. Consider GroupByKey when you need to aggregate or process elements with the same key together
5. Remember that PCollections are immutable - each transformation creates a new PCollection

## Common Pitfalls

1. Avoid storing large amounts of data in memory within ParDo transforms
2. Be careful with skewed keys in GroupByKey operations
3. Remember that elements in a PCollection are processed in parallel
4. Consider windowing when dealing with unbounded data
5. Be mindful of shuffle operations (GroupByKey, Join) as they can be expensive

## Performance Considerations

1. Use combiners with GroupByKey when possible to reduce data shuffle
2. Consider using side inputs for lookup tables instead of joins
3. Use windowing strategies appropriately for streaming data
4. Profile your pipeline to identify bottlenecks
5. Consider partition hints for large-scale data processing

import tensorflow as tf
import numpy as np
import logging
import os
import random
import xlwt

# disable the warnings
logging.getLogger('tensorflow').disabled = True

outfile_name = input()
iterations = int(input())
batch_size = int(input())

x = []
y = []
line_amount = 0
def read_data(fileName):
    global line_amount 

    f = open(fileName, 'r')
    lines = f.read().split('\n')
    line_amount = int(lines[0])

    T_amount = int(lines[1])
    for i in range(2, 2+T_amount):
        line_temp = list(map(lambda x: int(x), lines[i].split(' ')[0:line_amount]))
        x.append(line_temp)
        y.append([0, 1])
    
    F_amount = int(lines[2+T_amount])
    for i in range(3+T_amount, 3+T_amount+F_amount):
        line_temp = list(map(lambda x: int(x), lines[i].split(' ')[0:line_amount]))
        x.append(line_temp)
        y.append([1, 0])

    f.close()

def weight_variable(shape):
    initial = tf.truncated_normal(shape, stddev=0.1)
    return tf.Variable(initial)

def bias_variable(shape):
    initial = tf.constant(0.1, shape=shape)
    return tf.Variable(initial)

read_data('coverage-info')
x = np.array(x)
y = np.array(y)
# print(x)
# print(y)
# print(line_amount)
# os._exit(0)

num_h1 = 128

datas_placeholder = tf.placeholder(tf.float32, [None, line_amount]) # use datas/gen_d as input
labels_placeholder = tf.placeholder(tf.float32, [None, 2]) # use labels/gen_l as input
dropout_placeholder = tf.placeholder(tf.float32)

W1 = weight_variable([line_amount, num_h1])
b1 = bias_variable([num_h1])
h1 = tf.nn.relu(tf.matmul(datas_placeholder, W1) + b1)
h1_drop = tf.nn.dropout(h1, dropout_placeholder) # use dropout to avoid overfitting

W2 = weight_variable([num_h1, 2])
b2 = bias_variable([2])
out = tf.nn.softmax(tf.matmul(h1_drop, W2) + b2)
# out_argmax = tf.argmax(out, 1)

# tf.add_to_collection(tf.GraphKeys.WEIGHTS, W1)
# tf.add_to_collection(tf.GraphKeys.WEIGHTS, W2)
# regularizer = tf.contrib.layers.l2_regularizer(scale=3.0/x.shape[0])
# reg_term = tf.contrib.layers.apply_regularization(regularizer)

cross_entropy = -tf.reduce_sum(labels_placeholder*tf.log(out+1e-8))
loss = cross_entropy #+ reg_term

train_step = tf.train.AdamOptimizer(1e-4).minimize(loss)
correct_prediction = tf.equal(tf.argmax(out, 1), tf.argmax(labels_placeholder, 1))
accuracy = tf.reduce_mean(tf.cast(correct_prediction, "float"))

sess = tf.InteractiveSession()
sess.run(tf.initialize_all_variables())

# train the model
for i in range(iterations):
    rand_index = np.random.choice(x.shape[0], size = batch_size)
    rand_x = x[rand_index]
    rand_y = y[rand_index]
    if i % 100 == 0:
        train_feed_dict = {
            datas_placeholder: rand_x, 
            labels_placeholder: rand_y, 
            dropout_placeholder: 1.0
        }
        train_loss = cross_entropy.eval(train_feed_dict)
        print("step %d, loss %g"%(i, train_loss))

    train_step.run(feed_dict={
        datas_placeholder: rand_x, 
        labels_placeholder: rand_y, 
        dropout_placeholder: 0.6
    })

print('train ends')

test_x = []
for i in range(line_amount):
    temp = [0]*line_amount
    temp[i] = 1
    test_x.append(temp)

test_feed_dict = {
    datas_placeholder: test_x, 
    dropout_placeholder: 1.0
}
predict = out.eval(test_feed_dict)
predict = list(map(lambda x: x[0], predict))
print(predict)

data = xlwt.Workbook()
table=data.add_sheet('NN')
for i in range(line_amount):
    table.write(i, 0, predict[i].item())

data.save(outfile_name)
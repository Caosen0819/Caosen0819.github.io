# springboot整合kafka3.1，实现基本配置和操作

这篇是单机的zookeeper形式，适用于入门。等有时间会更新kraft搭建。

博主自己装了双系统，虚拟机刚刚删了，所以没去做集群，不过当大家的kafka版本来到3.1，建议大家去学习KRaft集群搭建而不是去整合zookeeper。下面介绍一下怎么整合，正所谓举一反三，这个会了，到时候换个环境就ok，讲的不好的地方还请见谅。



[toc]



## 前提准备

### 1、springboot

博主自己用的是2.7版本的

一般关于springboot我会引入一下依赖

~~~java
  <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>

        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter</artifactId>
        </dependency>

        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>

        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-aop</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
~~~



### 2、kafka

#### 1、kafka下载

https://kafka.apache.org/downloads  这里下载，这里再提一句，建议直接放到d盘e盘一级子目录里面，否则有可能出现启动的时候名字太长的问题

下载之后修改配置文件server.properties

log.dirs=E:\\kafka_2.13-3.2.3\\kafka-logs

#### 2、项目引入依赖

~~~
<dependency>
            <groupId>org.springframework.kafka</groupId>
            <artifactId>spring-kafka</artifactId>
            <version>根据自己的版本选择</version>  
        </dependency>
~~~

这里提一句：不一样的springboot对应的kafka依赖版本也不一样，所以先去官网查看依赖版本。

https://spring.io/projects/spring-kafka   点这个链接去找对应的，别自己乱下最新的。



##### 新版本的kafka命令和老版本的不一样。



试着启动，命令看你在哪个文件夹，如果是kafka，用下面的，如果是linux，把bat换成sh

~~~java
bin\windows\kafka-server-start.bat config\server.properties
~~~

简单使用

~~~
bin\windows\kafka-topics.bat --create --bootstrap-server localhost:9092 --replication-factor 1 --partitions 1 --topic test（自己取）
~~~

查看

~~~
bin\windows\kafka-topics.bat --list --bootstrap-server localhost:9092
~~~



### 3、zookeeper

新版本的kafka其实自己集成了zookeeper，博主这里同样介绍两种方式，一种自己重新去下个zookeeper，一种用kafka自带的。

#### 1、自带的

修改配置zookeeper.properties

~~~java
dataDir=/opt/kafka/zookeeper/data/dataDir
dataLogDir=/opt/kafka/zookeeper/data/dataLogDir
# the port at which the clients will connect
clientPort=2181
# disable the per-ip limit on the number of connections since this is a non-production config
maxClientCnxns=100
tickTime=2000
initLimit=10
~~~

~~~
bin\windows\zookeeper-server-start.bat config\zookeeper.properties
~~~

#### 2、自己下载zookeeper

由于是自己下载所以也不用去配置kafka文件中的zookeeper.properties

https://zookeeper.apache.org/releases.html#download  这是下载地址

进去之后很简单，一样改配置，进入conf目录下，将`zoo_example.cfg`重命名为`zoo.cfg`

同样修改dataDir和log， 我的是：

~~~java
example sakes.

dataDir=E:\\java-configuration\\apache-zookeeper-3.7.1-bin\\data

存放事务日志目录

dataLogDir=E:\\java-configuration\\apache-zookeeper-3.7.1-bin\\logs
~~~

然后运行zkserver.cmd和zkcli.cmd, 一个是启动我们的zookeeper服务器，一个是客户端。



## springboot整合操作kafka

![image-20220924153503966](C:\Users\CSEN\AppData\Roaming\Typora\typora-user-images\image-20220924153503966.png)

这里用一张图作为流程讲解如何整合。

### 1、config

其实可以把下面的conponent exception filter什么的都丢进来，可以配一些生产者消费者的信息，想配什么都可以，这个就不展示了。

### 2、回调（conponent）

回调有多种写法，这里介绍三种

#### 1、较为泛用的

~~~
@Component
public class KafkaSendResultHandler implements ProducerListener {


    @Override
    public void onSuccess(ProducerRecord producerRecord, RecordMetadata recordMetadata) {
        System.out.println("Message send success : " + producerRecord.toString());
    }

    @Override
    public void onError(ProducerRecord producerRecord, RecordMetadata recordMetadata, Exception exception) {
        System.out.println("Message send error : " + producerRecord.toString());
    }
}

~~~

然后在生产者里面使用

~~~
@Autowired
private KafkaSendResultHandler kafkaSendResultHandler;

。。。。。省略

kafkaTemplate.setProducerListener(kafkaSendResultHandler);    
~~~

#### 2、一个方法对应一个特定的回调

##### 1、第一种写法

```java
kafkaTemplate.send("topic1", callbackMessage).addCallback(success ->{
    String topic = success.getRecordMetadata().topic();
    int partition = success.getRecordMetadata().partition();
    long offset = success.getRecordMetadata().offset();
    System.out.println("发送消息成功:" + topic + "-" + partition + "-" + offset);

}, failure -> {
    System.out.println("发送消息失败:" + failure.getMessage());
});
```

##### 2、第二种写法

```java
kafkaTemplate.send("topic1", callbackMessage).addCallback(new ListenableFutureCallback<SendResult<String, Object>>() {
    @Override
    public void onFailure(Throwable ex) {
        System.out.println("发送消息失败："+ex.getMessage());

    }

    @Override
    public void onSuccess(SendResult<String, Object> result) {
        System.out.println("发送消息成功：" + result.getRecordMetadata().topic() + "-"
                + result.getRecordMetadata().partition() + "-" + result.getRecordMetadata().offset());

    }
});
```

### 3、consumer(消费者)

使用KafkaListener，指定消息类型（必选）和groupid，partitions offset（可选）

```

@KafkaListener(topics = {"topic1"}, groupId = "felix-group0" ,errorHandler = "consumerAwareErrorHandler")
public void onMessage1(ConsumerRecord<?,?> record){
    System.out.println("简单消费：" + record.topic() + "--" + record.partition() + "--" + record.value());

}

@KafkaListener(id = "comsumer1", groupId = "felix-group1", topicPartitions = {
        @TopicPartition(topic = "topic1", partitions = {"0"}),
        @TopicPartition(topic = "topic2", partitionOffsets = @PartitionOffset(partition = "0", initialOffset = "8"))
} ,errorHandler = "consumerAwareErrorHandler")
public void onMessage2(ConsumerRecord<?, ?> record){
    System.out.println("topic:"+record.topic()+"|partition:"+record.partition()+"|offset:"+record.offset()+"|value:"+record.value());
}
@KafkaListener(id = "consumer2",groupId = "felix-group2", topics = "topic1" ,errorHandler = "consumerAwareErrorHandler")
public void onMessage3(List<ConsumerRecord<?, ?>> records) {
    System.out.println(">>>批量消费一次，records.size()="+records.size());
    for (ConsumerRecord<?, ?> record : records) {
        System.out.println(record.value());
    }
}
```

### 4、controller生产者（produces）

#### 1、同步发送

如果需要使用同步发送，可以在每次发送之后使用get方法，因为producer.send方法返回一个Future类型的结果，Future的get方法会一直阻塞直到该线程的任务得到返回值，也就是broker返回发送成功。

~~~
kafkaTemplate.send("test", message).get();
~~~

#### 2、异步发送

可以从返回的future对象中稍后获取发送的结果，ProducerRecord、RecordMetadata包含了返回的结果信息

~~~
kafkaTemplate.send("test", message);
~~~

#### 3. 使用ack机制实现可靠

producers可以一步的并行向kafka发送消息，但是通常producer在发送完消息之后会得到一个响应，返回的是offset值或者发送过程中遇到的错误。这其中有个非常重要的参数“request.required.acks"，这个参数决定了producer要求leader partition收到确认的副本个数：

- 如果acks设置为0，表示producer不会等待broker的相应，所以，producer无法知道消息是否发生成功，这样有可能导致数据丢失，但同时，acks值为0会得到最大的系统吞吐量。
- 若acks设置为1，表示producer会在leader partition收到消息时得到broker的一个确认，这样会有更好的可靠性，因为客户端会等待知道broker确认收到消息。
- 若设置为-1，producer会在所有备份的partition收到消息时得到broker的确认，这个设置可以得到最高的可靠性保证。

### 5、exception

bean注入

```
@Bean
public ConsumerAwareListenerErrorHandler consumerAwareErrorHandler() {
    return (message, exception, consumer) -> {
        System.out.println("消费异常："+message.getPayload());
        return null;
    };
}
```

消费异常配置注解实现

```
@KafkaListener(topics = {"topic1"}, groupId = "felix-group0" ,errorHandler = "consumerAwareErrorHandler")
public void onMessage1(ConsumerRecord<?,?> record){
    System.out.println("简单消费：" + record.topic() + "--" + record.partition() + "--" + record.value());

}
```



### 6、filter

bean注入factory的时候配置好消息过滤策略

```
//配置消息过滤策略
    @Bean(value = "filterContainerFactory")
    public ConcurrentKafkaListenerContainerFactory concurrentKafkaListenerContainerFactory() {
        ConcurrentKafkaListenerContainerFactory factory = new ConcurrentKafkaListenerContainerFactory();
        factory.setConsumerFactory(consumerFactory);
        // 被过滤的消息将被丢弃
        factory.setAckDiscarded(true);
        // 消息过滤策略
        factory.setRecordFilterStrategy(consumerRecord -> {
            if (Integer.parseInt(consumerRecord.value().toString()) % 2 == 0) {
                return false;
            }
            else {
                return true;
            }
        });

        return factory;

    }
```

消费异常配置注解实现

```
// 消息过滤监听
    @KafkaListener(topics = {"topic1"}, containerFactory = "filterContainerFactory")
    public void onMessage6(ConsumerRecord<?, ?> record) {
        System.out.println(record.value());
    }
```

### 7、序列化编码解码

序列化器都实现了接口（`org.apache.kafka.common.serialization.Serializer`）

~~~
public interface Serializer<T> extends Closeable {
	default void configure(Map<String, ?> configs, Boolean isKey) {
	}
	byte[] serialize(String var1, T var2);
	default byte[] serialize(String topic, Headers headers, T data) {
		return this.serialize(topic, data);
	}
	default void close() {
	}
}

~~~

所以我们只用去实现serialize即可

#### 编码

    
    public class MySerializer implements Serializer {
        @Override
        public byte[] serialize(String s, Object o) {
            String json = JSON.toJSONString(o);
            return json.getBytes();
    }
    }
#### 解码

~~~
public class MyDeserializer implements Deserializer {
    private final static Logger logger = LoggerFactory.getLogger(MyDeserializer.class);

    @Override
    public Object deserialize(String s, byte[] bytes) {
        try {
            String json = new String(bytes,"utf-8");
            return JSON.parse(json);
        } catch (UnsupportedEncodingException e) {
            e.printStackTrace();
        }
        return null;
    }

}

~~~

最后在application中配置key-serializer 和 value-serializer

### 8、分区策略

分区策略一般分为四种情况：

- 有分区号，直接将数据发送到指定的分区里面去
- 没有分区号，但是给了数据的key值，根据key取hashCode进行分区
- 分区号和key值都没有，直接使用默认的轮循分区
- 自定义分区

#### 常规

~~~
测试
        kafkaTemplate.send("test", 0, key, "key=" + key + "，msg=指定0号分区");
        kafkaTemplate.send("test", key, "key=" + key + "，msg=不指定分区");

~~~

#### 自定义

~~~java
public class MyPartitioner implements Partitioner {

    @Override
    public int partition(String topic, Object key, byte[] keyBytes, Object value, byte[] valueBytes, Cluster cluster) {
//        定义自己的分区策略
//                如果key以0开头，发到0号分区
//                其他都扔到1号分区
        String keyStr = key+"";
        if (keyStr.startsWith("0")){
            return 0;
        }else {
            return 1;
        }
    }

    @Override
    public void close() {

    }

    @Override
    public void configure(Map<String, ?> map) {

    }
}

~~~

~~~java
@Configuration
public class MyPartitionTemplate {
 
    private final Logger logger = LoggerFactory.getLogger(this.getClass());

    @Value("${spring.kafka.bootstrap-servers}")
    private String bootstrapServers;

    KafkaTemplate kafkaTemplate;

    @PostConstruct
    public void setKafkaTemplate() {
        Map<String, Object> props = new HashMap<>();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        //注意分区器在这里！！！
        props.put(ProducerConfig.PARTITIONER_CLASS_CONFIG, MyPartitioner.class);
        this.kafkaTemplate = new KafkaTemplate<String, String>(new DefaultKafkaProducerFactory<>(props));
    }

    public KafkaTemplate getKafkaTemplate(){
        return kafkaTemplate;
    }
}

~~~

~~~
//测试自定义分区发送
@RestController
public class MyPartitionProducer {

    @Autowired
    MyPartitionTemplate template;

//    使用0开头和其他任意字母开头的key发送消息
//    看控制台的输出，在哪个分区里？
    @GetMapping("/kafka/myPartitionSend/{key}")
    public void setPartition(@PathVariable("key") String key) {
        template.getKafkaTemplate().send("test", key,"key="+key+"，msg=自定义分区策略");
    }
}

~~~

